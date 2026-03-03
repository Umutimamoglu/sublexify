package com.sublex.service;

import com.sublex.dto.WordAnalysisResultDTO;
import com.sublex.dto.WordContextDTO;
import com.sublex.model.Word;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WordAnalysisService {

    private final WordRepository wordRepository;
    private final GeminiService geminiService;
    private final TransactionTemplate transactionTemplate;

    private static final int BATCH_SIZE = 50; // Process 50 words at a time

    // @Scheduled removed — now triggered manually after media upload to reduce AI
    // costs
    public void processPendingWords() {
        // 1. Fetch pending words
        Pageable pageable = PageRequest.of(0, BATCH_SIZE);
        List<Word> pendingWords = wordRepository.findWordsForAnalysis(pageable);

        if (pendingWords.isEmpty()) {
            return;
        }

        log.info("Found {} pending words for analysis", pendingWords.size());

        try {
            // 2. Prepare payload for Gemini
            List<WordContextDTO> payload = pendingWords.stream()
                    .map(w -> new WordContextDTO(w.getWord(), w.getContextSentence()))
                    .collect(Collectors.toList());

            // 3. Call Gemini
            List<WordAnalysisResultDTO> results = geminiService.analyzeWordsWithContext(payload);

            if (results.isEmpty()) {
                log.warn("Gemini returned empty results for specific batch. Marking as failed.");
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

        transactionTemplate.execute(status -> {
            // 1. Collect and Prepare Root Words
            java.util.Set<String> rootWordsToResolve = new java.util.HashSet<>();
            for (Word word : words) {
                WordAnalysisResultDTO result = resultMap.get(word.getWord().toLowerCase());
                if (result != null && result.getRoot() != null) {
                    String root = result.getRoot();
                    if (!root.equalsIgnoreCase(word.getWord())) {
                        rootWordsToResolve.add(root);
                    }
                }
            }

            Map<String, Word> rootWordMap = new HashMap<>(); // wordText -> WordEntity
            if (!rootWordsToResolve.isEmpty()) {
                // Fetch existing roots
                String language = words.get(0).getLanguage(); // Assuming batch has same language
                List<Word> existingRoots = wordRepository.findByWordInAndLanguage(rootWordsToResolve, language);
                existingRoots.forEach(w -> rootWordMap.put(w.getWord().toLowerCase(), w));

                // Create missing roots
                List<Word> newRoots = new ArrayList<>();
                for (String rootText : rootWordsToResolve) {
                    if (!rootWordMap.containsKey(rootText.toLowerCase())) {
                        newRoots.add(Word.builder()
                                .word(rootText)
                                .language(language)
                                .status("PENDING") // Pending analysis for the root itself
                                .build());
                    }
                }

                if (!newRoots.isEmpty()) {
                    List<Word> savedRoots = wordRepository.saveAll(newRoots);
                    savedRoots.forEach(w -> rootWordMap.put(w.getWord().toLowerCase(), w));
                }
            }

            // 2. Update Words
            for (Word word : words) {
                WordAnalysisResultDTO result = resultMap.get(word.getWord().toLowerCase());

                if (result != null) {
                    // Update fields
                    word.setDifficulty(result.getDifficulty());
                    word.setIsProperNoun(result.getIsProperNoun());

                    // Link Root
                    if (result.getRoot() != null && !result.getRoot().equalsIgnoreCase(word.getWord())) {
                        Word root = rootWordMap.get(result.getRoot().toLowerCase());
                        if (root != null) {
                            word.setRootWord(root);

                            // MERGE LOGIC: Move counts from this word to the root word for all media
                            mergeMediaWordCounts(word, root);
                        }
                    }

                    word.setStatus("PROCESSED");
                    word.setRetryCount(0); // Reset retry count on success
                } else {
                    // Result missing for this specific word
                    markAsFailed(word);
                }
            }

            wordRepository.saveAll(words);
            return null;
        });
    }

    private final com.sublex.repository.MediaWordRepository mediaWordRepository;

    /**
     * Merges MediaWord counts from an inflected word to its root word.
     */
    private void mergeMediaWordCounts(Word inflectedWord, Word rootWord) {
        List<com.sublex.model.MediaWord> inflectedAssociations = mediaWordRepository
                .findByWordId(inflectedWord.getId());

        for (com.sublex.model.MediaWord infAssociation : inflectedAssociations) {
            Optional<com.sublex.model.MediaWord> rootAssociation = mediaWordRepository.findByMediaIdAndWordId(
                    infAssociation.getMedia().getId(),
                    rootWord.getId());

            if (rootAssociation.isPresent()) {
                // Add count to existing root association
                com.sublex.model.MediaWord rootMW = rootAssociation.get();
                rootMW.setCount(rootMW.getCount() + infAssociation.getCount());
                mediaWordRepository.save(rootMW);
                // Delete inflected association
                mediaWordRepository.delete(infAssociation);
            } else {
                // Re-link inflected association to root word
                infAssociation.setWord(rootWord);
                mediaWordRepository.save(infAssociation);
            }
        }
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
