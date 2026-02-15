package com.sublex.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sublex.model.Word;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final WordRepository wordRepository;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void auditRecentWords(int totalLimit) {
        List<Word> allWordsToAudit = wordRepository.findTopEnrichedWords(totalLimit);

        if (allWordsToAudit.isEmpty()) {
            log.info("No words to audit.");
            return;
        }

        log.info("Sheriff (Gemini Flash) auditing {} words in batches...", allWordsToAudit.size());

        int batchSize = 10;
        for (int i = 0; i < allWordsToAudit.size(); i += batchSize) {
            int end = Math.min(i + batchSize, allWordsToAudit.size());
            List<Word> batch = allWordsToAudit.subList(i, end);
            auditBatch(batch);
        }
    }

    private void auditBatch(List<Word> batch) {
        try {
            log.info("Auditing batch of {} words...", batch.size());

            List<Map<String, Object>> auditInput = batch.stream()
                    .map(w -> Map.of(
                            "id", w.getId(),
                            "word", w.getWord(),
                            "difficulty", w.getDifficulty(),
                            "definition", w.getDefinition()))
                    .collect(Collectors.toList());

            String inputJson = objectMapper.writeValueAsString(auditInput);

            String prompt = String.format(
                    """
                            You are 'The Sheriff', a high-capacity Linguistic Auditor.
                            Review the following English-to-Turkish word enrichments for accuracy, naturalness, and quality.

                            AUDIT RULES:
                            1. MATHEMATICAL ACCURACY: Numbers/Fractions (e.g., 'billionth') must be precise Turkish equivalents.
                            2. TURKISH NATURALNESS: Parenthesized translations in examples MUST be 100%% natural Turkish.
                            3. NO LOANWORD MIXING: No mixing languages (e.g., avoid "shooting'i", "fess up yaptı").
                            4. DEFINITION SIMPLICITY: Definitions must be simple and suitable for students.

                            INPUT DATA (JSON):
                            %s

                            RETURN JSON:
                            Return a list of IDs for words that FAIL the audit, with a short 'reason' in Turkish.
                            Structure: { "audit_results": [ { "id": 123, "fail": true, "reason": "..." } ] }
                            If all pass, return exactly: { "audit_results": [] }
                            """,
                    inputJson);

            String response = geminiService.generateContent(prompt);
            log.debug("Sheriff raw response: {}", response);

            if (response == null || response.trim().isEmpty()) {
                log.error("Sheriff returned an empty response for this batch.");
                return;
            }

            Map<String, Object> responseMap = objectMapper.readValue(response, new TypeReference<>() {
            });
            List<Map<String, Object>> results = (List<Map<String, Object>>) responseMap.get("audit_results");

            if (results == null || results.isEmpty()) {
                log.info("Sheriff approved all words in this batch.");
                return;
            }

            for (Map<String, Object> result : results) {
                if (Boolean.TRUE.equals(result.get("fail"))) {
                    Long id = Long.valueOf(result.get("id").toString());
                    String reason = (String) result.get("reason");

                    wordRepository.findById(id).ifPresent(word -> {
                        log.warn("Sheriff REJECTED word '{}': {}", word.getWord(), reason);
                        word.setNeedsReEnrichment(true);
                        wordRepository.save(word);
                    });
                }
            }

            log.info("Batch audit complete. Marked {} words for re-enrichment.", results.size());

        } catch (Exception e) {
            log.error("Failed to process Sheriff audit batch", e);
        }
    }
}
