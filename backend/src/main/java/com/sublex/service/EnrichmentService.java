package com.sublex.service;

import com.sublex.model.Word;
import com.sublex.model.WordDefinition;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;

@Service
@RequiredArgsConstructor
@Slf4j
public class EnrichmentService {

    private final WordRepository wordRepository;
    private final AIService aiService;
    private final Semaphore semaphore = new Semaphore(5);

    @Transactional
    public void enrichPendingWords() {
        List<Word> pendingWords = wordRepository.findPendingEnrichment();

        if (pendingWords.isEmpty()) {
            log.info("No pending words to enrich.");
            return;
        }

        LocalDateTime batchTime = LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        log.info("Starting parallel enrichment for {} words at {} (Semaphore limit: 5)...", pendingWords.size(),
                batchTime);
        long startTime = System.currentTimeMillis();

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (Word word : pendingWords) {
                executor.submit(() -> {
                    try {
                        semaphore.acquire();
                        try {
                            processWord(word, batchTime);
                        } finally {
                            semaphore.release();
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        log.error("Enrichment thread interrupted for word: {}", word.getWord());
                    } catch (Exception e) {
                        log.error("Unexpected error in enrichment thread for '{}': {}", word.getWord(), e.getMessage());
                    }
                });
            }
        } // Executor automatically waits for all virtual threads to complete here

        // Sequential Save (Single Transaction)
        wordRepository.saveAll(pendingWords);

        long duration = System.currentTimeMillis() - startTime;
        log.info("Parallel enrichment completed in {}ms.", duration);
    }

    private void processWord(Word word, LocalDateTime enrichedAt) {
        // Simple retry logic (max 3 attempts)
        int attempts = 0;
        WordDefinition definition = null;

        while (attempts < 3) {
            try {
                definition = aiService.enrichWord(word.getWord());
                if (definition != null)
                    break;
            } catch (Exception e) {
                attempts++;
                log.warn("Attempt {} failed for '{}': {}. Retrying...", attempts, word.getWord(), e.getMessage());
                if (attempts < 3) {
                    try {
                        Thread.sleep(1000 * attempts);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                    }
                }
            }
        }

        if (definition != null) {
            word.setDefinition(definition);
            word.setDifficulty(definition.getDifficulty());
            word.setIsEnriched(true);
            word.setNeedsReEnrichment(false);
            word.setEnrichedAt(enrichedAt);
            log.debug("Enriched '{}' ({})", word.getWord(), word.getDifficulty());
        } else {
            log.error("Failed to enrich word '{}' after 3 attempts.", word.getWord());
        }
    }
}
