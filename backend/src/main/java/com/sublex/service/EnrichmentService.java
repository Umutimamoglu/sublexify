package com.sublex.service;

import com.sublex.model.Word;
import com.sublex.model.WordDefinition;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EnrichmentService {

    private final WordRepository wordRepository;
    private final AIService aiService;

    @Transactional
    public void enrichPendingWords() {
        // Fetch a small batch to avoid timeouts
        List<Word> pendingWords = wordRepository.findTop10ByIsEnrichedFalse();

        if (pendingWords.isEmpty()) {
            log.info("No pending words to enrich.");
            return;
        }

        log.info("Starting enrichment for {} words...", pendingWords.size());

        for (Word word : pendingWords) {
            try {
                processWord(word);
            } catch (Exception e) {
                log.error("Error enriching word '{}': {}", word.getWord(), e.getMessage());
                // Optionally mark as failed or skip
            }
        }

        // Save all changes
        wordRepository.saveAll(pendingWords);
        log.info("Batch enrichment completed.");
    }

    private void processWord(Word word) {
        WordDefinition definition = aiService.enrichWord(word.getWord());

        if (definition != null) {
            word.setDefinition(definition);
            word.setDifficulty(definition.getDifficulty());
            word.setIsEnriched(true);
            log.debug("Enriched '{}' ({})", word.getWord(), word.getDifficulty());
        }
    }
}
