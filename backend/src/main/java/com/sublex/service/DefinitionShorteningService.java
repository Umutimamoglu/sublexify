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

    private static final int MAX_DEFINITION_LENGTH = 52;

    public Map<String, Object> getStats() {
        long pendingShortening = wordRepository.countShorteningCandidates("en", MAX_DEFINITION_LENGTH);
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
        List<Object[]> difficultyCounts = wordRepository.countShorteningCandidatesByDifficulty("en", MAX_DEFINITION_LENGTH);
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
     * Finds words with verbose definitions (A1-B1, definition > 60 chars).
     */
    public List<Word> findCandidates(int limit) {
        if (limit == Integer.MAX_VALUE) {
            return wordRepository.findShorteningCandidatesWithoutPageable("en", MAX_DEFINITION_LENGTH);
        }
        return wordRepository.findShorteningCandidates("en", MAX_DEFINITION_LENGTH, 
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
        // Build input: word + current verbose definitions + examples
        StringBuilder input = new StringBuilder();
        for (int i = 0; i < batch.size(); i++) {
            Word w = batch.get(i);
            StringBuilder defs = new StringBuilder();
            for (WordDefinition.Meaning m : w.getDefinition().getMeanings()) {
                if (m.getDefinition() != null && m.getDefinition().length() > MAX_DEFINITION_LENGTH) {
                    String examplePart = (m.getExample() != null && !m.getExample().isEmpty())
                            ? (" | Example: " + m.getExample())
                            : "";
                    defs.append(String.format("  - [%s] %s%s\n", m.getPos(), m.getDefinition(), examplePart));
                }
            }
            if (defs.length() > 0) {
                input.append(String.format("%d. WORD: \"%s\" (DIFFICULTY: %s)\n   VERBOSE DEFINITIONS:\n%s",
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
                - "shortened": array of objects with {"pos": "...", "old": "original definition", "new": "shortened definition"}

                Return ONLY valid JSON. No explanations.
                """;

        String userPrompt = "SHORTEN the following verbose Turkish definitions:\n\n" + input;

        try {
            String response = openAIService.generateContent(systemPrompt, userPrompt, "gpt-5.4-mini");
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
            Map<String, List<Map<String, String>>> shortenedMap = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
            for (Map<String, Object> r : results) {
                String word = (String) r.get("word");
                List<Map<String, String>> shortened = objectMapper.convertValue(r.get("shortened"),
                        new TypeReference<>() {
                        });
                if (word != null && shortened != null) {
                    shortenedMap.put(word, shortened);
                }
            }

            for (Word word : batch) {
                List<Map<String, String>> shortenings = shortenedMap.get(word.getWord());
                if (shortenings == null || shortenings.isEmpty())
                    continue;

                boolean updated = false;
                for (WordDefinition.Meaning meaning : word.getDefinition().getMeanings()) {
                    for (Map<String, String> s : shortenings) {
                        if (meaning.getDefinition() != null && s.get("new") != null) {
                            String currentDef = meaning.getDefinition().trim();
                            String gptOld = s.get("old") != null ? s.get("old").trim() : "";

                            // Eşleşmeyi esnek yap. GPT bazen boşlukları veya harfleri hafif kırpabilir.
                            boolean isMatch = currentDef.equals(gptOld) ||
                                    currentDef.contains(gptOld) ||
                                    gptOld.contains(currentDef);

                            // Alternatif olarak, eğer o POS (isim, fiil vb.) için kelimenin SADECE 1 anlamı
                            // varsa da esnek eşleşebiliriz
                            long posCount = word.getDefinition().getMeanings().stream()
                                    .filter(m -> m.getPos() != null && m.getPos().equals(meaning.getPos()))
                                    .count();

                            if (!isMatch && meaning.getPos() != null && meaning.getPos().equals(s.get("pos"))
                                    && posCount == 1) {
                                isMatch = true;
                            }

                            if (isMatch) {
                                log.info("Shortened '{}' [{}]: '{}' → '{}'",
                                        word.getWord(), meaning.getPos(), meaning.getDefinition(), s.get("new"));
                                meaning.setDefinition(s.get("new"));
                                updated = true;
                            }
                        }
                    }
                }

                if (updated) {
                    word.setAuditNotes("Definition shortened by AI [BATCH:" + batchId + "]");

                    // Sadece sorunları sıfırlıyoruz, ama orijinal enrich tarihini (enrichedAt)
                    // bozmuyoruz!
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
