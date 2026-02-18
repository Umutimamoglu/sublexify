package com.sublex.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sublex.model.Word;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
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

            // Veriyi hazırlarken gereksiz alanları atıyoruz (token tasarrufu)
            List<Map<String, Object>> auditInput = batch.stream()
                    .filter(w -> w.getDefinition() != null)
                    .map(w -> Map.of(
                            "id", w.getId(),
                            "word", w.getWord(),
                            "meanings", w.getDefinition().getMeanings() // Anlam kontrolü için şart
                    ))
                    .collect(Collectors.toList());

            if (auditInput.isEmpty())
                return;

            String inputJson = objectMapper.writeValueAsString(auditInput);

            // GÜÇLENDİRİLMİŞ PROMPT
            String prompt = String.format(
                    """
                            You are 'The Sheriff', a strict Linguistic Auditor for an English-Turkish Dictionary.
                            Your job is to REJECT any entry that violates the following strict laws.

                            ### THE LAWS (REJECTION CRITERIA):
                            1. **TRANSLATION LAW**: The 'example' sentence in Turkish MUST be natural and fluent.
                               - REJECT IF: It sounds like a robot/machine translation.
                               - REJECT IF: It uses English grammar order in Turkish (e.g., 'Dağcılar takip etti dere yatağını' vs 'Dağcılar dere yatağını takip etti').

                            2. **FALSE FRIEND LAW**:
                               - REJECT IF: The definition is for a Turkish word that looks like the English word (e.g., 'bide' -> 'bi de', 'hockey' -> 'hokey').

                            3. **DATA INTEGRITY**:
                               - REJECT IF: The definition does not match the word provided.

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

            // JSON Temizleme
            String cleanJson = cleanJsonFromMarkdown(response);

            Map<String, Object> responseMap = objectMapper.readValue(cleanJson, new TypeReference<>() {
            });
            List<Map<String, Object>> results = (List<Map<String, Object>>) responseMap.get("audit_results");

            if (results == null)
                results = Collections.emptyList();

            // MANTIK DÜZELTME: Listeyi Map'e çeviriyoruz (ID -> Reason)
            Map<Long, String> failureMap = results.stream()
                    .filter(r -> r != null && Boolean.TRUE.equals(r.get("fail")) && r.get("id") != null)
                    .collect(Collectors.toMap(
                            r -> Long.valueOf(r.get("id").toString()),
                            r -> r.get("reason") != null ? (String) r.get("reason") : "Hatalı tespit edildi.",
                            (existing, replacement) -> existing));

            for (Word word : batch) {
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
                wordRepository.save(word);
            }

            log.info("Batch audit complete. Rejected: {}, Approved: {}", failureMap.size(),
                    batch.size() - failureMap.size());

        } catch (Exception e) {
            log.error("Failed to process Sheriff audit batch", e);
        }
    }

    private String cleanJsonFromMarkdown(String response) {
        if (response == null)
            return "{}";
        String content = response.trim();
        if (content.startsWith("```json")) {
            content = content.substring(7);
        } else if (content.startsWith("```")) {
            content = content.substring(3);
        }
        if (content.endsWith("```")) {
            content = content.substring(0, content.length() - 3);
        }
        return content.trim();
    }
}
