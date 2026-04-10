package com.sublex.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sublex.model.Word;
import com.sublex.model.WordDefinition;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiConsumer;

@Service
@RequiredArgsConstructor
@Slf4j
public class DefinitionShorteningService {

    private final WordRepository wordRepository;
    private final OpenAIService openAIService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int MAX_DEFINITION_LENGTH = 60;
    private static final Set<String> TARGET_DIFFICULTIES = Set.of("A1", "A2", "B1");

    /**
     * Returns count of words that need definition shortening.
     */
    public Map<String, Object> getStats() {
        List<Word> candidates = findCandidates(Integer.MAX_VALUE);
        long shortened = wordRepository.countByAuditNotesContaining("Definition shortened");

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("pendingShortening", candidates.size());
        stats.put("alreadyShortened", shortened);

        // Extract last batch info
        String lastNote = wordRepository.findLastShorteningNote();
        String lastBatchId = null;
        if (lastNote != null && lastNote.contains("[BATCH:")) {
            int start = lastNote.indexOf("[BATCH:") + 7;
            int end = lastNote.indexOf("]", start);
            if (end > start) lastBatchId = lastNote.substring(start, end);
        }

        long lastBatchCount = 0;
        if (lastBatchId != null) {
            lastBatchCount = wordRepository.countByAuditNotesContaining(lastBatchId);
        }
        stats.put("lastBatchProcessed", lastBatchCount);
        stats.put("lastBatchId", lastBatchId);

        // Breakdown by difficulty
        Map<String, Long> byDifficulty = new LinkedHashMap<>();
        for (String diff : List.of("A1", "A2", "B1")) {
            byDifficulty.put(diff, candidates.stream()
                .filter(w -> diff.equalsIgnoreCase(w.getDifficulty()))
                .count());
        }
        stats.put("byDifficulty", byDifficulty);

        return stats;
    }

    /**
     * Finds words with verbose definitions (A1-B1, definition > 60 chars).
     */
    public List<Word> findCandidates(int limit) {
        List<Word> enrichedWords = wordRepository.findByIsEnrichedTrueAndLanguageAndDifficultyIn(
            "en", List.of("A1", "A2", "B1"));
        
        return enrichedWords.stream()
            .filter(w -> w.getDifficulty() != null && TARGET_DIFFICULTIES.contains(w.getDifficulty().toUpperCase()))
            .filter(w -> w.getDefinition() != null && w.getDefinition().getMeanings() != null)
            .filter(w -> !w.getDefinition().getMeanings().isEmpty())
            .filter(w -> {
                // Check if any meaning's definition is too long
                return w.getDefinition().getMeanings().stream()
                    .anyMatch(m -> m.getDefinition() != null && m.getDefinition().length() > MAX_DEFINITION_LENGTH);
            })
            .filter(w -> {
                // Skip already shortened words
                String notes = w.getAuditNotes();
                return notes == null || !notes.contains("Definition shortened");
            })
            .limit(limit)
            .toList();
    }

    /**
     * Runs the shortening pipeline for the given batch size.
     */
    public void shortenDefinitions(int batchSize, BiConsumer<Integer, Integer> progressCallback) {
        log.info("Starting Definition Shortening Pipeline for {} words", batchSize);

        List<Word> candidates = findCandidates(batchSize);
        int total = candidates.size();

        if (total == 0) {
            log.info("No words need definition shortening.");
            return;
        }

        log.info("Found {} words with verbose definitions. Processing...", total);

        int gpuBatchSize = 30; // 30 words per GPT call
        AtomicInteger processed = new AtomicInteger(0);
        String batchId = "B-" + System.currentTimeMillis();

        for (int i = 0; i < candidates.size(); i += gpuBatchSize) {
            int end = Math.min(i + gpuBatchSize, candidates.size());
            List<Word> batch = candidates.subList(i, end);

            try {
                shortenBatch(batch, batchId);
            } catch (Exception e) {
                log.error("Failed to shorten batch: {}", e.getMessage());
            }

            int done = processed.addAndGet(batch.size());
            if (progressCallback != null) {
                progressCallback.accept(done, total);
            }
        }

        log.info("Definition Shortening Pipeline complete. Processed {} words.", total);
    }

    private void shortenBatch(List<Word> batch, String batchId) {
        // Build input: word + current verbose definitions
        StringBuilder input = new StringBuilder();
        for (int i = 0; i < batch.size(); i++) {
            Word w = batch.get(i);
            StringBuilder defs = new StringBuilder();
            for (WordDefinition.Meaning m : w.getDefinition().getMeanings()) {
                if (m.getDefinition() != null && m.getDefinition().length() > MAX_DEFINITION_LENGTH) {
                    defs.append(String.format("  - [%s] %s\n", m.getPos(), m.getDefinition()));
                }
            }
            if (defs.length() > 0) {
                input.append(String.format("%d. WORD: \"%s\" (DIFFICULTY: %s)\n   VERBOSE DEFINITIONS:\n%s",
                    i + 1, w.getWord(), w.getDifficulty(), defs));
            }
        }

        String systemPrompt = """
                You are a Turkish Dictionary Editor. Your ONLY job is to SHORTEN verbose Turkish definitions to their simplest form.

                RULES:
                1. Replace long explanatory definitions with the shortest possible Turkish equivalent word(s).
                2. If a simple 1-2 word Turkish translation exists, USE IT.
                3. Do NOT change the meaning - just make it concise.
                4. Keep the same POS (part of speech).
                5. Do NOT add new meanings or remove existing ones.
                6. For words that genuinely need longer definitions (idiomatic expressions, rare words), keep them short but explanatory (max 40 chars).

                EXAMPLES:
                - "Motorlu, dört tekerlekli, insanları bir yerden başka bir yere taşımak için kullanılan kara taşıtı." → "Araba, otomobil."
                - "Üzerine yemek, eşya koyulan düz yüzeyli mobilya." → "Masa."
                - "Sayfalardan oluşan basılı ya da dijital eser." → "Kitap."
                - "Vücudu örtmek için giyilen kumaş parçası." → "Elbise, kıyafet."
                - "Bir yerden başka bir yere gitmek." → "Gitmek, yola çıkmak."

                OUTPUT FORMAT (JSON):
                Return a JSON array where each object has:
                - "word": the English word
                - "shortened": array of objects with {"pos": "...", "old": "original definition", "new": "shortened definition"}

                Return ONLY valid JSON. No explanations.
                """;

        String userPrompt = "SHORTEN the following verbose Turkish definitions:\n\n" + input;

        try {
            String response = openAIService.generateContent(systemPrompt, userPrompt, "gpt-5-mini");
            if (response == null) {
                log.error("GPT returned null for shortening batch");
                return;
            }

            String clean = response.replace("```json", "").replace("```", "").trim();

            // Parse response - could be array or wrapped object
            List<Map<String, Object>> results;
            if (clean.startsWith("[")) {
                results = objectMapper.readValue(clean, new TypeReference<>() {});
            } else {
                Map<String, Object> wrapper = objectMapper.readValue(clean, Map.class);
                Object arr = wrapper.values().stream().filter(v -> v instanceof List).findFirst().orElse(null);
                if (arr != null) {
                    results = objectMapper.convertValue(arr, new TypeReference<>() {});
                } else {
                    log.error("Cannot parse shortening response");
                    return;
                }
            }

            // Apply shortened definitions
            Map<String, List<Map<String, String>>> shortenedMap = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            for (Map<String, Object> r : results) {
                String word = (String) r.get("word");
                List<Map<String, String>> shortened = objectMapper.convertValue(r.get("shortened"), new TypeReference<>() {});
                if (word != null && shortened != null) {
                    shortenedMap.put(word, shortened);
                }
            }

            for (Word word : batch) {
                List<Map<String, String>> shortenings = shortenedMap.get(word.getWord());
                if (shortenings == null || shortenings.isEmpty()) continue;

                boolean updated = false;
                for (WordDefinition.Meaning meaning : word.getDefinition().getMeanings()) {
                    for (Map<String, String> s : shortenings) {
                        if (meaning.getDefinition() != null && 
                            meaning.getDefinition().equals(s.get("old")) &&
                            s.get("new") != null) {
                            log.info("Shortened '{}' [{}]: '{}' → '{}'", 
                                word.getWord(), meaning.getPos(), meaning.getDefinition(), s.get("new"));
                            meaning.setDefinition(s.get("new"));
                            updated = true;
                        }
                    }
                }

                if (updated) {
                    word.setAuditNotes("Definition shortened by AI [BATCH:" + batchId + "]");
                    word.setEnrichedAt(LocalDateTime.now());
                    
                    // Reset auditor flags so it gets re-audited
                    word.setStep3Error(null);
                    word.setProblemFound(false);
                }
            }

            wordRepository.saveAll(batch);
            log.info("Shortening batch saved. {} words processed.", batch.size());

        } catch (Exception e) {
            log.error("Failed to process shortening batch: {}", e.getMessage(), e);
        }
    }
}
