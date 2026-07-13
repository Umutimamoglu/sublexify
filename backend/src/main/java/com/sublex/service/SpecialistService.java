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
    private final OpenAIService openAIService;
    private final JudgeService judgeService;

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
        log.info("Gemini Specialist fixing {} words on thread {}...", count, Thread.currentThread().getName());

        for (int i = 0; i < count; i++) {
            Word word = flaggedWords.get(i);
            fixSingleWord(word, batchTime);
        }
    }

    /**
     * Fixes ALL flagged words in a language using Virtual Threads and batching.
     * This ignores media constraints and is ideal for global cleanup.
     */
    public void fixAllFlaggedWords(String language) {
        List<Word> allFlagged = wordRepository.findByLanguageAndIsEnrichedTrueAndNeedsReEnrichmentTrue(language);

        if (allFlagged.isEmpty()) {
            log.info("No flagged words found for global specialist fix.");
            return;
        }

        log.info("Global Specialist Fix: Found {} flagged words. Processing in parallel batches...", allFlagged.size());

        int batchSize = 20;
        java.time.LocalDateTime batchTime = java.time.LocalDateTime.now();
        List<List<Word>> batches = new java.util.ArrayList<>();
        for (int i = 0; i < allFlagged.size(); i += batchSize) {
            int end = Math.min(i + batchSize, allFlagged.size());
            batches.add(new java.util.ArrayList<>(allFlagged.subList(i, end)));
        }

        try (var executor = java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()) {
            for (List<Word> batch : batches) {
                executor.submit(() -> fixWordsBatch(batch, batchTime));
            }
        }

        log.info("Global Specialist Fix completed for {} words.", allFlagged.size());
    }

    public void fixWordsBatch(List<Word> batch, java.time.LocalDateTime batchTime) {
        if (batch == null || batch.isEmpty())
            return;

        try {
            log.info("Specialist fixing batch of {} words...", batch.size());
            Map<String, WordDefinition> fixedDefinitions = openAIService.fixWordsBatch(batch);

            for (Word word : batch) {
                WordDefinition fixedDef = fixedDefinitions.get(word.getWord());
                if (fixedDef != null) {
                    applySpecialistFix(word, fixedDef, batchTime);
                    wordRepository.save(word);
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
            // Use OpenAI batch fix for single word (wrap in list)
            Map<String, WordDefinition> result = openAIService.fixWordsBatch(List.of(word));
            WordDefinition fixedDef = result.get(word.getWord());

            if (fixedDef != null) {
                applySpecialistFix(word, fixedDef, batchTime);
                wordRepository.save(word);
            } else {
                log.error("Specialist failed to return a valid definition for '{}'", word.getWord());
            }
        } catch (Exception e) {
            log.error("Error during specialist fix for word '{}'", word.getWord(), e);
        }
    }

    private void applySpecialistFix(Word word, WordDefinition fixedDef, java.time.LocalDateTime batchTime) {
        word.setDefinition(fixedDef);

        // Protect existing difficulty: Only update if null (e.g., from Oxford or manual
        // verified state)
        if (word.getDifficulty() == null) {
            word.setDifficulty(fixedDef.getDifficulty());
        }

        // Root Correction Logic (to avoid Unique Constraint violations)
        String rootWordName = fixedDef.getWord();
        if (rootWordName != null && !word.getWord().equalsIgnoreCase(rootWordName)) {
            log.info("Specialist root correction: '{}' -> '{}'", word.getWord(), rootWordName);
            java.util.Optional<Word> existingRoot = wordRepository.findByWordAndLanguage(rootWordName,
                    word.getLanguage());

            if (existingRoot.isPresent() && !existingRoot.get().getId().equals(word.getId())) {
                log.info("Root word '{}' already exists (ID: {}). Linking instead of renaming.",
                        rootWordName, existingRoot.get().getId());
                word.setRootWord(existingRoot.get());
                // DON'T rename word.word to avoid duplicate key error
            } else {
                word.setWord(rootWordName);
            }
        }

        // Torpil yok: Sheriff (Step 2) ve Auditor (Step 3) kelimeyi baştan tekrar incelesin!
        word.setIsVerified(false); 
        word.setNeedsReEnrichment(false);
        word.setProblemFound(false);
        word.setStep3Error(null);
        word.setEnrichedAt(batchTime != null ? batchTime : java.time.LocalDateTime.now());
        word.setAuditNotes("Fixed by Specialist (OpenAI gpt-5.4-mini)");
        log.info("AFTER Specialist flag update for '{}': needs_re_enrichment={}, is_verified={}",
                word.getWord(), word.getNeedsReEnrichment(), word.getIsVerified());

        // AD-HOC JUDGE REMOVED — C1/C2 words are now judged in Pipeline Step 4 (batch
        // Judge)
        // This eliminates duplicate Judge calls and reduces API costs
    }
}
