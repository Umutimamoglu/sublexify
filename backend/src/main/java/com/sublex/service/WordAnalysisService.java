package com.sublex.service;

import com.sublex.dto.WordAnalysisResultDTO;
import com.sublex.dto.WordContextDTO;
import com.sublex.event.SubtitleProcessedEvent;
import com.sublex.model.Word;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WordAnalysisService {

    private final WordRepository wordRepository;
    private final OpenAIService openAIService;
    private final TransactionTemplate transactionTemplate;

    private static final int BATCH_SIZE = 20; // Process 20 words at a time to avoid heavy transaction timeouts

    // Debounce: wait 30 seconds after the last subtitle event before triggering analysis
    private final ScheduledExecutorService debounceScheduler = Executors.newSingleThreadScheduledExecutor();
    private volatile ScheduledFuture<?> pendingAnalysisTask;
    private static final long DEBOUNCE_DELAY_SECONDS = 30;

    /**
     * Debounced event listener: resets a 30-second timer each time a subtitle
     * is processed. Only fires triggerAnalysis() once 30 seconds pass with no
     * new events. This prevents redundant Gemini API calls when adding
     * multiple episodes in quick succession.
     */
    @EventListener
    public void onSubtitleProcessed(SubtitleProcessedEvent event) {
        log.info("SubtitleProcessedEvent received for mediaId: {}. Scheduling debounced analysis ({} sec delay)...",
                event.getMediaId(), DEBOUNCE_DELAY_SECONDS);

        // Cancel any previously scheduled analysis
        if (pendingAnalysisTask != null && !pendingAnalysisTask.isDone()) {
            pendingAnalysisTask.cancel(false);
            log.debug("Previous debounce timer cancelled. Resetting...");
        }

        // Schedule new analysis after delay
        pendingAnalysisTask = debounceScheduler.schedule(() -> {
            log.info("Debounce timer expired. Starting automatic word analysis...");
            try {
                triggerAnalysis();
            } catch (Exception e) {
                log.error("Auto-triggered word analysis failed: {}", e.getMessage(), e);
            }
        }, DEBOUNCE_DELAY_SECONDS, TimeUnit.SECONDS);
    }


    public void processPendingWords() {
        // 1. Fetch pending words
        Pageable pageable = PageRequest.of(0, BATCH_SIZE);
        List<Word> pendingWords = wordRepository.findWordsForAnalysis(pageable);

        if (pendingWords.isEmpty()) {
            return;
        }

        log.info("Found {} pending words for analysis", pendingWords.size());

        try {
            // 2. Prepare payload for OpenAI
            List<WordContextDTO> payload = pendingWords.stream()
                    .map(w -> new WordContextDTO(w.getWord(), w.getContextSentence()))
                    .collect(Collectors.toList());

            // 3. Call OpenAI
            List<WordAnalysisResultDTO> results = openAIService.analyzeWordsWithContext(payload);

            if (results.isEmpty()) {
                log.warn("OpenAI returned empty results for specific batch. Marking as failed.");
                handleBatchFailure(pendingWords);
                return;
            }

            // 4. Process results transactionally
            processResults(pendingWords, results);

        } catch (Exception e) {
            log.error("Error in word analysis job", e);
            handleBatchFailure(pendingWords);
        }
    }

    private void processResults(List<Word> words, List<WordAnalysisResultDTO> results) {
        Map<String, WordAnalysisResultDTO> resultMap = results.stream()
                .collect(Collectors.toMap(r -> r.getWord().toLowerCase(), r -> r, (a, b) -> a));

        log.info("Starting individual processing for batch of {} words", words.size());

        for (Word word : words) {
            try {
                processSingleWord(word, resultMap.get(word.getWord().toLowerCase()));
            } catch (Exception e) {
                log.error("Failed to process single word: {}", word.getWord(), e);
                // Mark only this word as failed
                transactionTemplate.execute(status -> {
                    markAsFailed(word);
                    wordRepository.save(word);
                    return null;
                });
            }
        }
    }

    private void processSingleWord(Word word, WordAnalysisResultDTO result) {
        if (result == null) {
            transactionTemplate.execute(status -> {
                markAsFailed(word);
                wordRepository.save(word);
                return null;
            });
            return;
        }

        transactionTemplate.execute(status -> {
            boolean languageChanged = false;
            String originalWord = word.getWord();
            String originalLanguage = word.getLanguage();
            
            // Check if language changed
            if (result.getLanguage() != null && !result.getLanguage().isEmpty() && !result.getLanguage().equalsIgnoreCase(word.getLanguage())) {
                String newLanguage = result.getLanguage();
                
                // Check for collision
                Optional<Word> collisionOpt = wordRepository.findByWordAndLanguage(word.getWord(), newLanguage);
                if (collisionOpt.isPresent()) {
                    Word existingWord = collisionOpt.get();
                    log.info("Collision detected for word '{}': changing {} -> {}. Merging into existing ID {}", 
                             word.getWord(), word.getLanguage(), newLanguage, existingWord.getId());
                    
                    // Transfer all media counts to the existing word
                    mergeMediaWordCounts(word.getId(), existingWord.getId());
                    
                    // Skip setting root or updates for this word, just mark it for deletion
                    word.setStatus("DELETED"); // Or just delete it
                    wordRepository.delete(word);
                    return null;
                }
                
                word.setLanguage(newLanguage);
                languageChanged = true;
            }

            // Update other fields
            word.setDifficulty(result.getDifficulty());
            word.setIsProperNoun(result.getIsProperNoun());

            // Link Root
            if (result.getRoot() != null && !result.getRoot().equalsIgnoreCase(word.getWord())) {
                String rootText = result.getRoot();
                String language = word.getLanguage(); // Use (potentially updated) language
                
                // Fetch or Create Root
                Optional<Word> rootOpt = wordRepository.findByWordAndLanguage(rootText, language);
                Word root;
                if (rootOpt.isPresent()) {
                    root = rootOpt.get();
                } else {
                    root = Word.builder()
                            .word(rootText)
                            .language(language)
                            .status("PENDING")
                            .build();
                    root = wordRepository.saveAndFlush(root);
                }
                word.setRootWord(root);
            }

            word.setStatus("PROCESSED");
            word.setRetryCount(0);
            
            // Save Word
            wordRepository.saveAndFlush(word);

            // NOW Merge Media Counts for Root Binding
            if (word.getRootWord() != null) {
                mergeMediaWordCounts(word.getId(), word.getRootWord().getId());
            }
            
            return null;
        });
    }

    private final com.sublex.repository.MediaWordRepository mediaWordRepository;

    /**
     * Merges MediaWord counts from an inflected word to its root word.
     */
    private void mergeMediaWordCounts(Long inflectedId, Long rootId) {
        // Use the optimized native sequence instead of the Java loop
        mediaWordRepository.updateExistingCounts(inflectedId, rootId);
        mediaWordRepository.moveUniqueAssociations(inflectedId, rootId);
        mediaWordRepository.deleteInflectedAfterMerge(inflectedId);
    }

    private void handleBatchFailure(List<Word> words) {
        // Just increment retry count for all words in the batch
        transactionTemplate.execute(status -> {
            for (Word word : words) {
                markAsFailed(word);
            }
            wordRepository.saveAll(words);
            return null;
        });
    }

    private void markAsFailed(Word word) {
        word.setStatus("FAILED");
        Integer currentRetry = word.getRetryCount();
        word.setRetryCount(currentRetry == null ? 1 : currentRetry + 1);
    }

    // Public method to trigger manually
    public void triggerAnalysis() {
        log.info("triggerAnalysis() called");
        int processedCount = 0;
        int maxBatches = 100; // Process up to 5000 words in one trigger
        int batchCount = 0;

        while (batchCount < maxBatches) {
            Pageable pageable = PageRequest.of(0, BATCH_SIZE);
            List<Word> pendingWords = wordRepository.findWordsForAnalysis(pageable);

            if (pendingWords.isEmpty()) {
                log.info("Analysis trigger completed. Total words processed in this run: {}", processedCount);
                break;
            }

            log.info("Trigger analysis loop: processing batch {} ({} words)", batchCount + 1, pendingWords.size());
            processPendingWords();
            processedCount += pendingWords.size();
            batchCount++;

            // Brief pause between batches to respect API rate limits
            try {
                Thread.sleep(1000);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("Analysis trigger loop interrupted");
                break;
            }
        }

        if (batchCount >= maxBatches) {
            log.warn("Trigger analysis loop reached safety limit of {} batches", maxBatches);
        }
    }
}
