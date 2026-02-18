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

    public void auditRecentWords(int totalLimit) {
        List<Word> allWordsToAudit = wordRepository.findTopEnrichedWords(totalLimit);

        if (allWordsToAudit.isEmpty()) {
            log.info("No words to audit.");
            return;
        }

        log.info("Sheriff (Gemini 3.0 Pro) auditing {} words in PARALLEL batches...", allWordsToAudit.size());

        int batchSize = 10;
        List<List<Word>> batches = new ArrayList<>();
        for (int i = 0; i < allWordsToAudit.size(); i += batchSize) {
            int end = Math.min(i + batchSize, allWordsToAudit.size());
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
                                    : List.of()));
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
            String prompt = String.format(
                    """
                            You are the Sheriff. A ruthless Dictionary Auditor for an English-to-Turkish dictionary.

                            YOUR GOAL: Analyze the provided list of words one by one. You must provide a VERDICT for EVERY single word.

                            ### THE LAWS (STRICT CRITERIA):
                            1. **ROOT MISMATCH (CRITICAL)**:
                               - Check 'phrasal_verbs'. Do they belong to the root word?
                               - Example FAILURE: Word is 'fast', but phrasal verb is 'fasten up' (Root mismatch: fast != fasten).
                               - Example FAILURE: Word is 'staying' (gerund), but phrasal verb is 'stay up' (base form). Ideally, the headword should be base form.

                            2. **HALLUCINATION LAW**:
                               - Do the phrasal verbs actually exist in standard English? (e.g., 'post out' is suspicious).

                            3. **DATA INTEGRITY**:
                               - Does the definition match the headword? (e.g., Word 'wouldn' defined as 'wouldn't').
                               - Are there grammar errors in English examples? (e.g., 'She gave him a thank').

                            4. **TRANSLATION QUALITY**:
                               - Is the Turkish example natural? (e.g., 'Ekmek rulosu' is bad translation for 'bread roll', use 'sandviç ekmeği').

                            ### INPUT DATA:
                            %s

                            ### OUTPUT FORMAT (JSON ONLY):
                            You must return a list of objects for ALL items.

                            [
                              {
                                "id": 123,
                                "word": "example",
                                "verdict": "REJECT", // or "APPROVE"
                                "reasoning": "The phrasal verb 'example up' does not exist." // Required if REJECT
                              },
                              ...
                            ]
                            """,
                    inputJson);

            String response = geminiService.generateContent(prompt);

            if (response == null || response.isEmpty()) {
                log.error("Sheriff (Gemini) returned empty response. Skipping batch to prevent false approvals.");
                return;
            }

            // 3. Response İşleme (Robust Parsing)
            String cleanJson = cleanJsonFromMarkdown(response);

            // Artık direkt List<Map> bekliyoruz, kök obje içinde değil.
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
                    String verdict = (String) r.getOrDefault("verdict", "REJECT"); // Güvenli taraf: Belirsizse Reddet

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
                    word.setAuditNotes(null); // Varsa eski notları temizle
                } else {
                    // Model bu ID'yi unuttuysa, güvenlik gereği REDDET veya tekrar sıraya al
                    log.error("Sheriff forgot to audit word '{}'. Marking as suspicious.", word.getWord());
                    word.setNeedsReEnrichment(true); // Tekrar denensin
                }
            }

            // 5. Toplu Kayıt (DB Connection Friendly)
            // Tüm batch'i (hem pre-audit reddedilenleri hem de audit sonucu
            // güncellenenleri) tek seferde kaydet
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

        // Remove markdown code blocks if present
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

        // Find the actual JSON start (either [ or {)
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
