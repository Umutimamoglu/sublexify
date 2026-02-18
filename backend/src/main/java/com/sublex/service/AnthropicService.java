package com.sublex.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sublex.model.WordDefinition;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnthropicService {

    @Value("${ANTHROPIC_API_KEY}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.create();

    private static final String ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
    private static final String CLAUDE_MODEL = "claude-haiku-4-5";

    public WordDefinition fixWord(String word, String auditNotes) {
        log.info("Claude Specialist fixing word: '{}' because: {}", word, auditNotes);

        // SYSTEM PROMPT: Kurallar + ÖRNEKLER (Few-Shot)
        String systemPrompt = """
                You are a strict Lead Lexicographer and QA Specialist for an English-to-Turkish dictionary.
                Your task is to correct erroneous data entries based on Audit Notes.

                ### CRITICAL RULES
                1. **FALSE FRIENDS & HALLUCINATIONS**:
                   - Verify the word exists in the Oxford/Cambridge English Dictionary.
                   - If the input is "bide", define the English verb (to wait), NOT the Turkish slang "bi de".
                   - If the input is "balls", define it technically or anatomically, avoid vulgar slang unless marked as idiom.

                2. **NATURAL TURKISH TRANSLATION**:
                   - Definitions must sound like a TDK dictionary entry, not a machine translation.
                   - Avoid passive voice oddities like "yapılan kişidir". Use direct definitions.
                   - Example sentences must be natural. Avoid "Tom went to the school" (Tom okula gitti). Use context: "The little boy didn't want to go to school." (Küçük çocuk okula gitmek istemiyordu.)

                ### REFERENCE EXAMPLES (FOLLOW THIS PATTERN)

                Input Word: "illustration"
                {
                  "word": "illustration",
                  "difficulty": "B2",
                  "meanings": [{
                    "definition": "Bir metni açıklamak veya süslemek amacıyla kullanılan resim, çizim.",
                    "example": "The book has beautiful illustrations of birds. (Kitapta kuşlara ait güzel çizimler var.)",
                    "pos": "noun"
                  }]
                }

                Input Word: "unforgettable"
                {
                  "word": "unforgettable",
                  "difficulty": "B1",
                   "meanings": [{
                    "definition": "Akıldan çıkmayan, unutulması mümkün olmayan.",
                    "example": "The trip to Paris was an unforgettable experience. (Paris gezisi unutulmaz bir deneyimdi.)",
                    "pos": "adjective"
                  }]
                }

                ### YOUR TASK
                Fix the user provided word strictly following the Audit Note.
                Return ONLY the valid JSON object. Do not include markdown formatting like ```json.
                """;

        // USER PROMPT: Denetçi notunu vurgula
        String userPrompt = String.format(
                """
                        Here is the REJECTED entry that needs fixing.

                        TARGET WORD: "%s"
                        AUDIT REJECTION REASON: "%s"

                        INSTRUCTIONS:
                        1. Read the rejection reason carefully.
                        2. If the rejection says "Natural translation needed", rewrite the Turkish parts completely.
                        3. Ensure the output is valid JSON matching the schema in the examples.
                        """,
                word, auditNotes);

        try {
            Map<String, Object> requestBody = Map.of(
                    "model", CLAUDE_MODEL,
                    "max_tokens", 2048,
                    "system", systemPrompt,
                    "messages", List.of(
                            Map.of("role", "user", "content", userPrompt)));

            String response = restClient.post()
                    .uri(ANTHROPIC_URL)
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", "2023-06-01")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            Map<String, Object> responseMap = objectMapper.readValue(response, Map.class);
            List<Map<String, Object>> contentList = (List<Map<String, Object>>) responseMap.get("content");
            String content = (String) contentList.get(0).get("text");

            log.info("Claude raw response for {}: {}", word, content);

            String jsonContent = content;
            if (content.contains("```json")) {
                jsonContent = content.substring(content.indexOf("```json") + 7);
                if (jsonContent.contains("```")) {
                    jsonContent = jsonContent.substring(0, jsonContent.lastIndexOf("```"));
                }
            } else if (content.contains("```")) {
                jsonContent = content.substring(content.indexOf("```") + 3);
                if (jsonContent.contains("```")) {
                    jsonContent = jsonContent.substring(0, jsonContent.lastIndexOf("```"));
                }
            }
            jsonContent = jsonContent.trim();

            return objectMapper.readValue(jsonContent, WordDefinition.class);

        } catch (org.springframework.web.client.HttpClientErrorException e) {
            log.error("Anthropic API Error ({}): {}", e.getStatusCode(), e.getResponseBodyAsString());
            return null;
        } catch (Exception e) {
            log.error("Claude Specialist failed to fix word: {}", word, e);
            return null;
        }
    }
}
