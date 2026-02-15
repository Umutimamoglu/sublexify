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
public class SpecialistService {

    private final WordRepository wordRepository;
    private final AnthropicService anthropicService;

    @Transactional
    public void fixFlaggedWords(String language, int limit) {
        List<Word> flaggedWords = wordRepository.findByLanguageAndIsEnrichedTrueAndNeedsReEnrichmentTrue(language);

        if (flaggedWords.isEmpty()) {
            log.info("No words flagging for specialist fix.");
            return;
        }

        int count = Math.min(flaggedWords.size(), limit);
        log.info("Claude Specialist fixing {} words...", count);

        for (int i = 0; i < count; i++) {
            Word word = flaggedWords.get(i);
            fixSingleWord(word);
        }
    }

    private void fixSingleWord(Word word) {
        try {
            log.info("Specialist fixing word '{}'. Reason: {}", word.getWord(), word.getAuditNotes());

            WordDefinition fixedDefinition = anthropicService.fixWord(word.getWord(), word.getAuditNotes());

            if (fixedDefinition != null) {
                word.setDefinition(fixedDefinition);
                word.setIsVerified(true);
                word.setNeedsReEnrichment(false);
                word.setEnrichedAt(java.time.LocalDateTime.now());
                word.setAuditNotes("Fixed by Specialist (Claude 3.5)");
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
