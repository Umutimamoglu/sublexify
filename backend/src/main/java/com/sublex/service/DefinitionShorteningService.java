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

    public Map<String, Object> getStats() {
        long pendingShortening = wordRepository.countShorteningCandidates("en");
        long shortened = wordRepository.countByAuditNotesContaining("Definition shortened");

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("pendingShortening", pendingShortening);
        stats.put("alreadyShortened", shortened);

        // Extract last batch info
        String lastNote = wordRepository.findLastShorteningNote();
        String lastBatchId = null;
        if (lastNote != null && lastNote.contains("[BATCH:")) {
            int start = lastNote.indexOf("[BATCH:") + 7;
            int end = lastNote.indexOf("]", start);
            if (end > start)
                lastBatchId = lastNote.substring(start, end);
        }

        long lastBatchCount = 0;
        if (lastBatchId != null) {
            lastBatchCount = wordRepository.countByAuditNotesContaining(lastBatchId);
        }

        stats.put("lastBatchProcessed", lastBatchCount);
        stats.put("lastBatchId", lastBatchId);

        // Breakdown by difficulty from native query GROUP BY
        List<Object[]> difficultyCounts = wordRepository.countShorteningCandidatesByDifficulty("en");
        Map<String, Long> byDifficulty = new LinkedHashMap<>();
        for (String diff : List.of("A1", "A2", "B1", "B2", "C1", "C2")) {
            long count = 0;
            for (Object[] row : difficultyCounts) {
                String d = (String) row[0];
                if (diff.equalsIgnoreCase(d)) {
                    count = ((Number) row[1]).longValue();
                    break;
                }
            }
            byDifficulty.put(diff, count);
        }
        stats.put("byDifficulty", byDifficulty);

        return stats;
    }

    /**
     * Finds words the AI Auditor has flagged as having a verbose definition
     * (audit_notes = "Auditor: SHORTEN..."). Candidacy is an AI judgment call,
     * not a character-count threshold.
     */
    public List<Word> findCandidates(int limit) {
        if (limit == Integer.MAX_VALUE) {
            return wordRepository.findShorteningCandidatesWithoutPageable("en");
        }
        return wordRepository.findShorteningCandidates("en",
                org.springframework.data.domain.PageRequest.of(0, limit));
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

        int gpuBatchSize = 30; // 10 words per GPT call
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
        // Build input: word + current verbose definitions + examples, each meaning
        // tagged with its exact index in that word's meanings array. The model must
        // echo this index back — that's what lets us apply the result unambiguously
        // instead of fuzzy-matching old text, which previously mixed up meanings
        // (e.g. wrote a verb's shortened text into a noun slot for words with
        // multiple same-POS meanings).
        StringBuilder input = new StringBuilder();
        for (int i = 0; i < batch.size(); i++) {
            Word w = batch.get(i);
            StringBuilder defs = new StringBuilder();
            List<WordDefinition.Meaning> meaningsList = w.getDefinition().getMeanings();
            for (int mi = 0; mi < meaningsList.size(); mi++) {
                WordDefinition.Meaning m = meaningsList.get(mi);
                if (m.getDefinition() != null) {
                    String examplePart = (m.getExample() != null && !m.getExample().isEmpty())
                            ? (" | Example: " + m.getExample())
                            : "";
                    defs.append(String.format("  - [%d][%s] %s%s\n", mi, m.getPos(), m.getDefinition(), examplePart));
                }
            }
            if (defs.length() > 0) {
                input.append(String.format("%d. WORD: \"%s\" (DIFFICULTY: %s)\n   VERBOSE DEFINITIONS (format: [index][pos] definition):\n%s",
                        i + 1, w.getWord(), w.getDifficulty(), defs));
            }
        }

        String systemPrompt = """
                You are a Turkish Dictionary Editor. Your job is to SHORTEN verbose Turkish definitions to their simplest dictionary form.

                CRITICAL INSTRUCTIONS:
                1. 1-TO-1 TRANSLATION IS PRIORITY: Eğer İngilizce kelimenin doğrudan Türkçe tek veya iki kelimelik tam bir karşılığı varsa (Örn: Hallucination = Halüsinasyon, Apple = Elma), KESİNLİKLE açıklayıcı cümle kurma! Doğrudan bu kısa karşılığı yaz.
                2. PRESERVE THE ORIGINAL MEANING: Eğer kelimenin kısa bir çevirisi yoksa ve anlamı vermek için orijinal uzun cümlenin kalması ŞART ise (yani kısaltmak anlamı bozacaksa), DÜZENLEME YAPMAMA HAKKINA SAHİPSİN. Bu durumda orijinal cümleyi aynen bırak.
                3. Her anlamı kısaltırken o anlamın örnek cümlesini (Example) REFERANS AL. Kısaltılan tanım ile örnek cümle anlam olarak kesinlikle uyuşmalıdır.
                4. Keep the same POS (part of speech). Do NOT add new meanings or remove existing ones.
                5. NO DUPLICATE DEFINITIONS: If your shortening results in two identical definitions for the same word and the same POS, you MUST slightly differentiate them.
                6. Avoid confusing words: e.g. for 'resume' (to start again), use 'kaldığı yerden devam etmek', not 'yeniden başlatmak'. Sadece ORİJİNAL tanımın kastettiği anlamı ver.
                7. DO NOT LENGTHEN: Yeni tanım ASLA orijinal tanımdan daha uzun veya karakter sayısı olarak daha fazla olamaz. Eğer kelime zaten kısaysa (örn: "Nişasta") KESİNLİKLE DOKUNMA. Noktalama işareti veya büyük harf eklemek için (örn: "ağ" -> "Ağ.") asla değişiklik yapma.
                8. NO TRANSLITERATION OF MEDICAL/TECHNICAL TERMS: Eğer İngilizce tıbbi bir terimin Türkçe karşılığı sadece o kelimenin Türkçe okunuşuysa (Örn: "dysesthesia" -> "Disestezi"), KISALTMA YAPMA. Orijinal açıklayıcı tanımı AYNEN BIRAK.

                EXAMPLES:
                - "Motorlu, dört tekerlekli, insanları bir yerden taşımak için kullanılan taşıt." → "Araba, otomobil."
                - "Gözlem yapmak, incelemek ve bakmak." → "Gözlemlemek."

                OUTPUT FORMAT (JSON):
                Return a JSON array where each object has:
                - "word": the English word
                - "shortened": array of objects with {"index": <the exact [index] number shown before that meaning in the input>, "new": "shortened definition"}
                Only include an entry for a meaning if you actually changed its text. The "index" MUST exactly match the [index] tag from the input — this is how your answer gets applied, so never guess or renumber it.

                Return ONLY valid JSON. No explanations.
                """;

        String userPrompt = "SHORTEN the following verbose Turkish definitions:\n\n" + input;

        try {
            String response = openAIService.generateContent(systemPrompt, userPrompt, "gpt-5.6-luna");
            if (response == null) {
                log.error("GPT returned null for shortening batch");
                return;
            }

            String clean = response.replace("```json", "").replace("```", "").trim();

            // Parse response - could be array or wrapped object
            List<Map<String, Object>> results;
            if (clean.startsWith("[")) {
                results = objectMapper.readValue(clean, new TypeReference<>() {
                });
            } else {
                Map<String, Object> wrapper = objectMapper.readValue(clean, Map.class);
                Object arr = wrapper.values().stream().filter(v -> v instanceof List).findFirst().orElse(null);
                if (arr != null) {
                    results = objectMapper.convertValue(arr, new TypeReference<>() {
                    });
                } else {
                    log.error("Cannot parse shortening response");
                    return;
                }
            }

            // Apply shortened definitions
            Map<String, List<Map<String, Object>>> shortenedMap = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            for (Map<String, Object> r : results) {
                String word = (String) r.get("word");
                List<Map<String, Object>> shortened = objectMapper.convertValue(r.get("shortened"),
                        new TypeReference<>() {
                        });
                if (word != null && shortened != null) {
                    shortenedMap.put(word, shortened);
                }
            }

            for (Word word : batch) {
                List<Map<String, Object>> shortenings = shortenedMap.get(word.getWord());

                boolean updated = false;
                if (shortenings != null && !shortenings.isEmpty()) {
                    List<WordDefinition.Meaning> meanings = word.getDefinition().getMeanings();
                    for (Map<String, Object> s : shortenings) {
                        Object indexObj = s.get("index");
                        Object newObj = s.get("new");
                        if (indexObj == null || newObj == null) {
                            continue;
                        }
                        int index = ((Number) indexObj).intValue();
                        if (index < 0 || index >= meanings.size()) {
                            log.warn("Shortening batch: '{}' returned out-of-range index {} (has {} meanings) — skipped",
                                    word.getWord(), index, meanings.size());
                            continue;
                        }

                        WordDefinition.Meaning meaning = meanings.get(index);
                        String newDef = String.valueOf(newObj);
                        log.info("Shortened '{}' [{}] idx={}: '{}' → '{}'",
                                word.getWord(), meaning.getPos(), index, meaning.getDefinition(), newDef);
                        meaning.setDefinition(newDef);
                        updated = true;
                    }
                }

                if (updated) {
                    word.setAuditNotes("Definition shortened by AI [BATCH:" + batchId + "]");

                    // step3Error='Clean' (not null) marks this word as already audited, so
                    // findWordsForAuditing() doesn't pull it back into the pending pool and
                    // re-route it endlessly. Orijinal enrich tarihini (enrichedAt) bozmuyoruz.
                    word.setStep3Error("Clean");
                    word.setProblemFound(false);
                } else {
                    // GPT decided this word needed no actual change (already concise, or a
                    // false-positive SHORTEN routing). Clear the marker so it exits the
                    // candidate pool instead of being re-queued by every future run.
                    word.setAuditNotes("Clean");
                    word.setStep3Error("Clean");
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
