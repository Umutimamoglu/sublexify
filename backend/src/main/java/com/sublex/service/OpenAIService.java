package com.sublex.service;

import com.fasterxml.jackson.core.JsonProcessingException;
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
public class OpenAIService implements AIService {

    @Value("${OPENAI_API_KEY}")
    private String apiKey;

    private final ObjectMapper objectMapper;
    private final RestClient restClient = RestClient.create();

    private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
    private static final String MODEL = "gpt-4o-mini";

    @Override
    public WordDefinition enrichWord(String word) {
        log.info("Enriching word via OpenAI: {}", word);

        String prompt = String.format(
                """
                        Analyze the word '%s'. Return a JSON object with:
                        1. 'word': the word itself.
                        2. 'difficulty': CEFR level (A1-C2).
                        3. 'meanings': Array of objects, grouped by Part of Speech. For each POS, provide the most common 1-2 meanings.
                           - 'pos': part of speech (noun, verb, adj, etc.)
                           - 'definition': short, clear definition.
                           - 'example': strictly 1 example sentence.
                        4. 'phrasal_verbs': Array of 2-3 common phrasal verbs (if any).
                           - 'phrase': the phrasal verb.
                           - 'definition': short definition.
                           - 'example': 1 example sentence.

                        Ensure the JSON matches this structure exactly:
                        {
                          "word": "...",
                          "difficulty": "...",
                          "meanings": [{ "pos": "...", "definition": "...", "example": "..." }],
                          "phrasal_verbs": [{ "phrase": "...", "definition": "...", "example": "..." }]
                        }
                        """,
                word);

        try {
            Map<String, Object> requestBody = Map.of(
                    "model", MODEL,
                    "messages", List.of(
                            Map.of("role", "system", "content",
                                    "You are a dictionary assistant backend. You output only valid JSON."),
                            Map.of("role", "user", "content", prompt)),
                    "response_format", Map.of("type", "json_object"));

            String response = restClient.post()
                    .uri(OPENAI_URL)
                    .header("Authorization", "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            // Parse response to get choices[0].message.content
            Map<String, Object> responseMap = objectMapper.readValue(response, Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseMap.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String content = (String) message.get("content");

            return objectMapper.readValue(content, WordDefinition.class);

        } catch (Exception e) {
            log.error("Failed to enrich word: {}", word, e);
            return null;
        }
    }
}
