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
    private final RestClient restClient = RestClient.builder()
            .requestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory(
                    java.net.http.HttpClient.newBuilder()
                            .connectTimeout(java.time.Duration.ofSeconds(60))
                            .build()))
            .build();

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    // User requested "3 pro" i.e., gemini-3-pro-preview for Sheriff
    // For Pipeline, "3 flash" likely refers to gemini-2.0-flash as it is the
    // current flash preview/model
    public static final String SHERIFF_MODEL = "gemini-3-pro-preview";
    public static final String PIPELINE_MODEL = "gemini-2.5-flash";
    private static final String DEFAULT_MODEL = PIPELINE_MODEL;

    public List<com.sublex.dto.WordAnalysisResultDTO> analyzeWordsWithContext(
            List<com.sublex.dto.WordContextDTO> words) {
        if (words == null || words.isEmpty()) {
            return List.of();
        }

        try {
            String jsonInput = objectMapper.writeValueAsString(words);
            String prompt = String.format(
                    """
                            Sana bir kelime listesi ve bağlam cümleleri veriyorum. Her kelime için:
                            1. Cümledeki kullanımına bakarak kelimenin sözlük kökünü (lemma) bul.
                               - Eğer kelime bir isim veya sıfat olarak kalıplaşmışsa (örn: 'meeting' -> Toplantı, 'building' -> Bina), kökünü BOZMA, aynen bırak.
                               - Eğer fiil çekimiyse (örn: 'is meeting' -> meet), kökünü fiil olarak bul.
                               - Eğer kelime kesme işareti veya tire içeriyorsa (örn: 'don't', 'long-term'), bunu tek bir bütün olarak ele al ve bağlama göre en uygun kökü bul (örn: 'don't' -> 'do', 'long-term' -> 'long-term').
                            2. Kelimenin zorluk seviyesini (A1-C2) belirle.
                            3. Eğer kelime bir özel isimse 'is_proper_noun: true' olarak işaretle.

                            Girdi JSON:
                            %s

                            Çıktıyı şu JSON formatında bir liste olarak ver:
                            [
                              { "word": "meeting", "root": "meeting", "difficulty": "B1", "is_proper_noun": false },
                              { "word": "ran", "root": "run", "difficulty": "A1", "is_proper_noun": false }
                            ]
                            Sadece JSON dizisi döndür.
                            """,
                    jsonInput);

            String response = generateContent(prompt, PIPELINE_MODEL);
            if (response == null)
                return List.of();

            // Clean up markdown code blocks if present
            String cleanResponse = response.replace("```json", "").replace("```", "").trim();

            return objectMapper.readValue(cleanResponse,
                    new com.fasterxml.jackson.core.type.TypeReference<List<com.sublex.dto.WordAnalysisResultDTO>>() {
                    });

        } catch (Exception e) {
            log.error("Error analyzing words with context", e);
            return List.of();
        }
    }

    public String generateContent(String prompt) {
        return generateContent(prompt, DEFAULT_MODEL);
    }

    public String generateContent(String prompt, String model) {
        if (apiKey == null || apiKey.isEmpty()) {
            log.error("GEMINI_API_KEY is missing from environment!");
            return null;
        }
        log.info("Calling Gemini API with model: {} (Key length: {})", model, apiKey.length());

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "response_mime_type", "application/json"
                // "thinking_level", "low" // API support varies, keeping simple for now
                ));

        try {
            String response = restClient.post()
                    .uri(GEMINI_BASE_URL + model + ":generateContent?key=" + apiKey)
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
            log.error("Gemini API call failed. Model: {}. Error: {}", model, e.getMessage(), e);
            return null;
        }
    }
}
