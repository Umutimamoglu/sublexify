package com.sublex.service;

import com.fasterxml.jackson.databind.ObjectMapper;
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
public class GeminiService {

    @Value("${GEMINI_API_KEY}")
    private String apiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient = RestClient.create();

    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    public String generateContent(String prompt) {
        if (apiKey == null || apiKey.isEmpty()) {
            log.error("GEMINI_API_KEY is missing from environment!");
            return null;
        }
        log.info("Calling Gemini API with model: gemini-2.5-flash (Key length: {})", apiKey.length());

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "response_mime_type", "application/json"));

        try {
            String response = restClient.post()
                    .uri(GEMINI_URL + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            if (response == null) {
                log.error("Gemini returned null response body");
                return null;
            }
            log.debug("Gemini response: {}", response);

            Map<String, Object> responseMap = objectMapper.readValue(response, Map.class);
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) responseMap.get("candidates");
            if (candidates == null || candidates.isEmpty()) {
                log.error("No candidates returned from Gemini. Full response: {}", response);
                return null;
            }

            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            if (content == null)
                return null;

            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            if (parts == null || parts.isEmpty())
                return null;

            return (String) parts.get(0).get("text");

        } catch (Exception e) {
            log.error("Gemini API call failed. Model: gemini-2.5-flash. Error: {}", e.getMessage(), e);
            return null;
        }
    }
}
