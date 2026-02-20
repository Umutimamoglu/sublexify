package com.sublex.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sublex.model.Word;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final WordRepository wordRepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final int SHERIFF_BATCH_SIZE = 10;

    public void auditRecentWords(int totalLimit) {
        auditRecentWords(totalLimit, null);
    }

    public void auditRecentWords(int totalLimit, Long mediaId) {
        List<Word> allWordsToAudit = (mediaId == null)
                ? wordRepository.findTopEnrichedWords(totalLimit)
                : wordRepository.findTopEnrichedWordsByMediaId(mediaId, totalLimit);

        if (allWordsToAudit.isEmpty()) {
            log.info("No words to audit for mediaId: {}.", mediaId);
            return;
        }

        log.info("Sheriff (Gemini 3 Flash Preview) auditing {} words in PARALLEL batches (Media ID: {})...",
                allWordsToAudit.size(),
                mediaId);

        List<List<Word>> batches = new ArrayList<>();
        for (int i = 0; i < allWordsToAudit.size(); i += SHERIFF_BATCH_SIZE) {
            int end = Math.min(i + SHERIFF_BATCH_SIZE, allWordsToAudit.size());
            batches.add(new ArrayList<>(allWordsToAudit.subList(i, end)));
        }

        log.info("Sheriff splitting into {} parallel batches.", batches.size());

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (List<Word> batch : batches) {
                executor.submit(() -> auditBatch(batch));
            }
        }

        log.info("Sheriff parallel audit complete.");
    }

    private void auditBatch(List<Word> batch) {
        try {
            log.info("Auditing batch of {} words...", batch.size());

            // 1. Filtreleme: Tanımı olmayanları ayır (Silent Approval Fix)
            List<Map<String, Object>> auditInput = new ArrayList<>();
            List<Word> validWordsForGemini = new ArrayList<>();

            for (Word w : batch) {
                if (w.getDefinition() != null && w.getDefinition().getMeanings() != null) {
                    auditInput.add(Map.of(
                            "id", w.getId(),
                            "word", w.getWord(),
                            "meanings", w.getDefinition().getMeanings(),
                            "phrasal_verbs",
                            w.getDefinition().getPhrasalVerbs() != null ? w.getDefinition().getPhrasalVerbs()
                                    : List.of(),
                            "verb_forms",
                            w.getDefinition().getVerbForms() != null ? w.getDefinition().getVerbForms()
                                    : Map.of()));
                    validWordsForGemini.add(w);
                } else {
                    // Tanımı olmayanları direkt reddet
                    w.setNeedsReEnrichment(true);
                    w.setIsVerified(false);
                    w.setAuditNotes("Definition or meanings missing (Pre-Audit check).");
                }
            }

            if (auditInput.isEmpty()) {
                wordRepository.saveAll(batch); // Sadece reddedilenler varsa kaydet
                return;
            }

            // 2. Gemini Çağrısı
            String inputJson = objectMapper.writeValueAsString(auditInput);
            String systemPrompt = """
                    You are the Sheriff. A ruthless, zero-tolerance Dictionary Auditor for an English-to-Turkish dictionary.

                    YOUR GOAL: Analyze the provided list of words one by one. You MUST provide a VERDICT for EVERY SINGLE WORD in the input array. If you receive 25 words, you MUST return exactly 25 JSON objects. Do not skip any!

                    ### THE LAWS (STRICT CRITERIA - ZERO TOLERANCE):
                    1. **ROOT MISMATCH (CRITICAL)**:
                       - Check 'phrasal_verbs'. Do they belong to the root word?
                       - Example FAILURE: Word is 'fast', but phrasal verb is 'fasten up' (Root mismatch). REJECT.
                       - Example FAILURE: Word is 'staying' (gerund), but phrasal verb is 'stay up'. REJECT.

                    2. **HALLUCINATION LAW**:
                       - Do the phrasal verbs actually exist in standard English? (e.g., 'post out' is suspicious). REJECT if fake.

                    3. **DATA INTEGRITY & COMPLETENESS**:
                       - Does the definition match the headword?
                       - Are any essential fields missing, empty, or null in meanings or examples? REJECT if incomplete.
                       - Are there grammar errors in English examples? (e.g., 'She gave him a thank'). REJECT.

                    4. **TRANSLATION QUALITY**:
                       - Is the Turkish translation natural and accurate? (e.g., 'Ekmek rulosu' is bad for 'bread roll', use 'sandviç ekmeği'). REJECT if robotic or incorrect.

                    5. **VERB FORMS INTEGRITY (CRITICAL)**:
                       - If ANY meaning of the word has "pos": "verb", the 'verb_forms' object MUST contain valid, non-null values for 'v1', 'v2', 'v3', and 'ing'.
                       - Example FAILURE: Word is 'merge' (verb) but verb_forms are null/empty. REJECT.
                       - Example FAILURE: Word is 'pace' (verb) but verb_forms show 'pacing' for all forms. REJECT.

                    6. **PART OF SPEECH (POS) STANDARDIZATION (CRITICAL)**:
                       - The 'pos' value MUST be fully written out.
                       - Allowed values: "noun", "verb", "adjective", "adverb", "pronoun", "preposition", "conjunction", "determiner", "number".
                       - Example FAILURE: "pos": "adj" (Must be "adjective"). REJECT.

                    7. **HOMONYM ANTI-POLLUTION (CRITICAL)**:
                       - Only meanings directly related to the semantic context of the target word are allowed.
                       - Example FAILURE: Word is 'mining', root is 'mine', but meanings include 'benimki' (pronoun). REJECT.

                    8. **SEMANTIC UNIQUENESS LAW (NEW)**:
                       - REJECT if meanings are redundant or nearly identical (e.g., "web sitesi" and "internet sayfası" as separate entries for "website").
                       - If a word has one dominant meaning, it should NOT have a forced second meaning.

                    9. **INTERNAL FORMATTING LAW (NEW)**:
                       - REJECT if a single 'definition' string contains a manual list (e.g., "1) süpürmek 2) temizlemek").
                       - Multiple meanings MUST be separate objects in the 'meanings' array, NOT a single string with numbers.

                    ### OUTPUT FORMAT (JSON ONLY):
                    You MUST return ONLY a valid JSON array of objects. No markdown, no explanations outside JSON.
                    [
                      {
                        "id": 123,
                        "word": "example",
                        "verdict": "REJECT", // or "APPROVE"
                        "reasoning": "The 'pos' is written as 'adj' instead of 'adjective'." // Provide clear reason if REJECT. Leave empty or "Looks good" if APPROVE.
                      }
                    ]
                    """;

            String userPrompt = String.format("### INPUT DATA:\n%s", inputJson);

            String response = geminiService.generateContent(systemPrompt, userPrompt, GeminiService.SHERIFF_MODEL);

            if (response == null || response.isEmpty()) {
                log.error("Sheriff (Gemini) returned empty response. Skipping batch to prevent false approvals.");
                return;
            }

            // 3. Response İşleme (Robust Parsing)
            String cleanJson = cleanJsonFromMarkdown(response);

            List<Map<String, Object>> results = objectMapper.readValue(cleanJson,
                    new TypeReference<List<Map<String, Object>>>() {
                    });

            Map<Long, String> failureMap = new HashMap<>();
            List<Long> approvedIds = new ArrayList<>();

            if (results != null) {
                for (Map<String, Object> r : results) {
                    Object idObj = r.get("id");
                    if (idObj == null)
                        continue;

                    Long id = Long.valueOf(idObj.toString());
                    String verdict = (String) r.getOrDefault("verdict", "REJECT");

                    if ("REJECT".equalsIgnoreCase(verdict)) {
                        String reasoning = (String) r.getOrDefault("reasoning", "Unspecified violation.");
                        failureMap.put(id, reasoning);
                    } else {
                        approvedIds.add(id);
                    }
                }
            }

            // 4. Durum Güncelleme
            for (Word word : validWordsForGemini) {
                if (failureMap.containsKey(word.getId())) {
                    String reason = failureMap.get(word.getId());
                    log.warn("Sheriff REJECTED word '{}' (ID: {}): {}", word.getWord(), word.getId(), reason);

                    word.setNeedsReEnrichment(true);
                    word.setIsVerified(false);
                    word.setAuditNotes(reason);
                } else if (approvedIds.contains(word.getId())) {
                    log.info("Sheriff APPROVED word '{}'", word.getWord());

                    word.setIsVerified(true);
                    word.setNeedsReEnrichment(false);
                    word.setAuditNotes(null);
                } else {
                    log.error("Sheriff forgot to audit word '{}'. Marking as suspicious.", word.getWord());
                    word.setNeedsReEnrichment(true);
                }
            }

            // 5. Toplu Kayıt
            wordRepository.saveAll(batch);

            log.info("Batch audit complete. Verified: {}, Rejected: {}",
                    validWordsForGemini.size() - failureMap.size(), failureMap.size());

        } catch (Exception e) {
            log.error("Failed to process Sheriff audit batch", e);
        }
    }

    private String cleanJsonFromMarkdown(String response) {
        if (response == null)
            return "[]";
        String content = response.trim();

        if (content.contains("```json")) {
            content = content.substring(content.indexOf("```json") + 7);
            if (content.contains("```")) {
                content = content.substring(0, content.lastIndexOf("```"));
            }
        } else if (content.contains("```")) {
            content = content.substring(content.indexOf("```") + 3);
            if (content.contains("```")) {
                content = content.substring(0, content.lastIndexOf("```"));
            }
        }

        content = content.trim();

        int firstBracket = content.indexOf("[");
        int firstBrace = content.indexOf("{");
        int start = -1;

        if (firstBracket != -1 && (firstBrace == -1 || firstBracket < firstBrace)) {
            start = firstBracket;
        } else {
            start = firstBrace;
        }

        if (start == -1)
            return content;

        int lastBracket = content.lastIndexOf("]");
        int lastBrace = content.lastIndexOf("}");
        int end = Math.max(lastBracket, lastBrace);

        if (end == -1)
            return content.substring(start);

        return content.substring(start, end + 1);
    }
}