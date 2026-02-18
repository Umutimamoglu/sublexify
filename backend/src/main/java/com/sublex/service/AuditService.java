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

        log.info("Sheriff (Gemini Flash) auditing {} words in PARALLEL batches...", allWordsToAudit.size());

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
                            You are the Sheriff. A strict Dictionary Auditor and Chief Editor for an English-to-Turkish dictionary project called 'Sublex'.
                            Your job is to REJECT any entry that sounds unnatural, translated by a machine, or linguistically incorrect.

                            ### THE LAWS (REJECTION CRITERIA):
                            1. **TRANSLATION LAW**: The 'example' sentence in Turkish MUST be natural and fluent.
                               - REJECT IF: It sounds like a robot/machine translation.
                               - REJECT IF: It uses English grammar order in Turkish (e.g., 'Dağcılar takip etti dere yatağını' vs 'Dağcılar dere yatağını takip etti').

                            2. **FALSE FRIEND LAW**:
                               - REJECT IF: The definition is for a Turkish word that looks like the English word (e.g., 'bide' -> 'bi de', 'hockey' -> 'hokey').

                            3. **DATA INTEGRITY**:
                               - REJECT IF: The definition does not match the word provided.

                            4. **HALLUCINATION LAW**:
                               - REJECT IF: The definition contains 'phrasal_verbs' that do not exist or are forced (e.g., 'tea' -> 'tea off', 'murder' -> 'murder up').
                               - REJECT IF: The phrasal verb spelling does not match the root word (e.g., 'tea' vs 'tee').

                            ### INPUT DATA (JSON):
                            %s

                            ### OUTPUT FORMAT:
                            Return a JSON object containing a list of FAILED items only.
                            If an item is correct, DO NOT include it in the list.

                            Format:
                            {
                              "audit_results": [
                                { "id": 123, "fail": true, "reason": "Example sentence is unnatural/machine translated." }
                              ]
                            }
                            """,
                    inputJson);

            String response = geminiService.generateContent(prompt);

            if (response == null || response.isEmpty()) {
                log.error("Sheriff (Gemini) returned empty response. Skipping batch to prevent false approvals.");
                return;
            }

            // 3. Response İşleme (Robust Parsing)
            String cleanJson = cleanJsonFromMarkdown(response);
            Map<String, Object> responseMap = objectMapper.readValue(cleanJson, new TypeReference<>() {
            });
            List<Map<String, Object>> results = (List<Map<String, Object>>) responseMap.get("audit_results");

            // Failure Map Oluşturma (NPE Safe)
            Map<Long, String> failureMap = new HashMap<>();
            if (results != null) {
                for (Map<String, Object> r : results) {
                    if (Boolean.TRUE.equals(r.get("fail"))) {
                        Object idObj = r.get("id");
                        if (idObj != null) {
                            failureMap.put(Long.valueOf(idObj.toString()),
                                    (String) r.getOrDefault("reason", "Hatalı tespit edildi."));
                        }
                    }
                }
            }

            // 4. Durum Güncelleme (Sadece Gemini'ye gidenler için)
            for (Word word : validWordsForGemini) {
                if (failureMap.containsKey(word.getId())) {
                    String reason = failureMap.get(word.getId());
                    log.warn("Sheriff REJECTED word '{}': {}", word.getWord(), reason);

                    word.setNeedsReEnrichment(true);
                    word.setIsVerified(false);
                    word.setAuditNotes(reason);
                } else {
                    log.info("Sheriff APPROVED word '{}'", word.getWord());

                    word.setIsVerified(true);
                    word.setNeedsReEnrichment(false);
                    word.setAuditNotes(null);
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
            return "{}";
        int firstBrace = response.indexOf("{");
        int lastBrace = response.lastIndexOf("}");

        if (firstBrace != -1 && lastBrace != -1) {
            return response.substring(firstBrace, lastBrace + 1);
        }
        return response.trim(); // Fallback
    }
}
