package com.sublex.service;

import com.sublex.model.Word;
import com.sublex.model.WordDefinition;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpecialistService {

    private final WordRepository wordRepository;
    private final GeminiService geminiService;

    // @Transactional removed to prevent connection holding during HTTP calls
    public void fixFlaggedWords(String language, int limit, java.time.LocalDateTime batchTime) {
        fixFlaggedWords(language, limit, batchTime, null);
    }

    public List<Word> getFlaggedWords(String language, Long mediaId) {
        return (mediaId == null)
                ? wordRepository.findByLanguageAndIsEnrichedTrueAndNeedsReEnrichmentTrue(language)
                : wordRepository.findByMediaIdAndNeedsReEnrichmentTrue(mediaId);
    }

    public void fixFlaggedWords(String language, int limit, java.time.LocalDateTime batchTime, Long mediaId) {
        List<Word> flaggedWords = getFlaggedWords(language, mediaId);

        if (flaggedWords.isEmpty()) {
            log.info("No words flagging for specialist fix.");
            return;
        }

        int count = Math.min(flaggedWords.size(), limit);
        log.info("Gemini Specialist fixing {} words...", count);

        for (int i = 0; i < count; i++) {
            Word word = flaggedWords.get(i);
            fixSingleWord(word, batchTime);
        }
    }

    public void fixWordsBatch(List<Word> batch, java.time.LocalDateTime batchTime) {
        if (batch == null || batch.isEmpty())
            return;

        try {
            log.info("Specialist fixing batch of {} words...", batch.size());
            Map<String, WordDefinition> fixedDefinitions = geminiService.fixWordsBatch(batch);

            for (Word word : batch) {
                WordDefinition fixedDefinition = fixedDefinitions.get(word.getWord());
                if (fixedDefinition != null) {
                    // Update word with fixed definition
                    word.setDefinition(fixedDefinition);

                    // If the root was changed (e.g., plurals), update the word headword itself!
                    if (!fixedDefinition.getWord().equalsIgnoreCase(word.getWord())) {
                        log.info("Specialist root correction: '{}' -> '{}'", word.getWord(), fixedDefinition.getWord());
                        word.setWord(fixedDefinition.getWord());
                    }

                    word.setIsVerified(true);
                    word.setNeedsReEnrichment(false);
                    word.setEnrichedAt(batchTime != null ? batchTime : java.time.LocalDateTime.now());
                    word.setAuditNotes("Fixed by Specialist (Gemini 2.5 Pro) - Batch processed");
                    wordRepository.save(word);
                    log.info("Specialist successfully fixed word '{}'", word.getWord());
                } else {
                    log.error("Specialist failed to return a valid definition for '{}' in batch", word.getWord());
                }
            }
        } catch (Exception e) {
            log.error("Error during specialist batch fix", e);
        }
    }

    public void fixSingleWord(Word word, java.time.LocalDateTime batchTime) {
        try {
            log.info("Specialist fixing word '{}'. Reason: {}", word.getWord(), word.getAuditNotes());

            WordDefinition fixedDefinition = geminiService.fixWord(word.getWord(), word.getAuditNotes());

            if (fixedDefinition != null) {
                word.setDefinition(fixedDefinition);
                word.setIsVerified(true);
                word.setNeedsReEnrichment(false);
                word.setEnrichedAt(batchTime != null ? batchTime : java.time.LocalDateTime.now());
                word.setAuditNotes("Fixed by Specialist (Gemini 2.5 Pro)");
                wordRepository.save(word);
                log.info("Specialist successfully fixed word '{}'", word.getWord());
            } else {
                log.error("Specialist failed to return a valid definition for '{}'", word.getWord());
            }
        } catch (Exception e) {
            log.error("Error during specialist fix for word '{}'", word.getWord(), e);
        }
    }
}
