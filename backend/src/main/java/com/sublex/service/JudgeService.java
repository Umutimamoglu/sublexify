package com.sublex.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sublex.model.Word;
import com.sublex.model.WordDefinition;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class JudgeService {

    @Value("${OPENAI_API_KEY}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.builder()
            .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory() {
                {
                    setConnectTimeout(Duration.ofSeconds(30));
                    setReadTimeout(Duration.ofSeconds(180));
                }
            })
            .build();

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-5.4-mini";

    /**
     * The Judge evaluates C1/C2 words and complex flagged entries.
     * Returns a proposed WordDefinition (verdict) — does NOT auto-save.
     */
    public WordDefinition judgeWord(Word wordObj, WordDefinition currentDefinition) {
        String word = wordObj.getWord();
        log.info("Judge (GPT-5-mini) evaluating word: '{}'", word);

        String currentJson;
        try {
            currentJson = objectMapper.writeValueAsString(currentDefinition);
        } catch (Exception e) {
            currentJson = "{}";
        }

        String prompt = String.format(
                """
                        You are 'The Judge', a senior reasoning-based quality gate for
                        an English-to-Turkish dictionary called Sublex.

                        Your task: Review the CURRENT definition and improve it if needed.
                        Be insight-dense but concise. Don't add filler. Capture the cultural
                        spirit and feeling of the word, not just the literal meaning.

                        ## VERDICT CRITERIA:
                        1. **Ambiguity Resolution**: If the word has multiple meanings, prioritize
                           the most contextually relevant one for a language learner.
                        2. **CEFR-Semantic Alignment**: Ensure the Turkish definition matches
                           the complexity level. A B1 definition should be understandable by
                           a B1 student.
                        3. **Slang & Idiom Accuracy**: Capture the *feeling* of slang, not just
                           the dictionary definition.
                        4. **Native Verdict**: The translation must sound like a bilingual friend,
                           not a dictionary robot.
                        5. **SEMANTIC UNIQUENESS (CRITICAL)**: Do NOT provide or approve redundant or near-identical meanings. If a word primarily has one meaning, provide ONLY ONE.
                        6. **NO NESTED LISTS (CRITICAL)**: Each 'definition' must be a SINGLE string. Do NOT use numbered lists (e.g., "1) ... 2) ...") inside a definition string. Use separate objects in the 'meanings' array instead.

                        ## TARGET WORD: "%s"

                        ## CONTEXT (CRITICAL):
                        The word appeared in this sentence: "%s"
                        The Turkish definition MUST fit this specific usage.

                        ## CURRENT DEFINITION:
                        %s

                        ## INSTRUCTIONS:
                        - Return ONLY valid JSON matching the exact same schema as the current definition.
                        - If the current definition is already excellent and fits the CONTEXT, return it unchanged.
                        - If improvements are needed to match the CONTEXT or improve quality, apply them and return the improved version.
                        - Do NOT include markdown formatting like ```json.
                        """,
                word, wordObj.getContextSentence() != null ? wordObj.getContextSentence() : "", currentJson);

        try {
            Map<String, Object> requestBody = Map.of(
                    "model", MODEL,
                    "messages", List.of(
                            Map.of("role", "system", "content",
                                    "You are a dictionary quality judge. You output only valid JSON."),
                            Map.of("role", "user", "content", prompt)),
                    "response_format", Map.of("type", "json_object"));

            String response = restClient.post()
                    .uri(OPENAI_URL)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            Map<String, Object> responseMap = objectMapper.readValue(response, Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseMap.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String rawContent = (String) message.get("content");
            String cleanContent = rawContent.replace("```json", "").replace("```", "").trim();

            return objectMapper.readValue(cleanContent, WordDefinition.class);

        } catch (Exception e) {
            log.error("Judge (GPT-5-mini) failed for word '{}'. Error: {}", word, e.getMessage());
            return null;
        }
    }
}
