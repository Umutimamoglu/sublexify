package com.sublex.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sublex.model.Word;
import com.sublex.model.WordDefinition;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Primary
public class GeminiService implements AIService {

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
    public static final String SHERIFF_MODEL = "gemini-3-flash-preview";
    public static final String PIPELINE_MODEL = "gemini-2.5-pro";
    public static final String SPECIALIST_MODEL = "gemini-2.5-pro";
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
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            log.info("DEBUG GEMINI REQUEST BODY: {}", jsonBody);

            String response = restClient.post()
                    .uri(GEMINI_BASE_URL + model + ":generateContent?key=" + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(jsonBody)
                    .retrieve()
                    .body(String.class);

            if (response == null) {
                log.error("Gemini returned null response body");
                return null;
            }
            log.info("DEBUG RAW GEMINI RESPONSE: {}", response);

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

            String rawText = (String) parts.get(0).get("text");
            System.out.println("DEBUG RAW GEMINI RESPONSE: " + rawText);
            return rawText;

        } catch (Exception e) {
            log.error("Gemini API call failed. Model: {}. Error: {}", model, e.getMessage(), e);
            return null;
        }
    }

    @Override
    public WordDefinition enrichWord(String word, String difficulty) {
        // Individual enrichment using Gemini Pro/Flash
        return fixWord(word, "Initial orientation");
    }

    @Override
    public WordDefinition enrichTrustedWord(String word, String difficulty) {
        // Simple delegator for now to satisfy interface
        return enrichWord(word, difficulty);
    }

    @Override
    public Map<String, WordDefinition> enrichWordsBatch(List<Word> words) {
        if (words == null || words.isEmpty())
            return Map.of();

        log.info("Gemini Worker enriching batch of {} words", words.size());

        StringBuilder batchDetails = new StringBuilder();
        for (int i = 0; i < words.size(); i++) {
            Word w = words.get(i);
            batchDetails.append(
                    String.format("%d. WORD: \"%s\", CONTEXT: \"%s\"\n", i + 1, w.getWord(), w.getContextSentence()));
        }

        String systemPrompt = """
                You are a meticulous Lexicographer.
                Your mission is to provide high-quality dictionary entries for English words used in a specific context.

                ### MANDATORY QUALITY CONTROLS:
                1. **TURKISH TRANSLATION IS STRICTLY REQUIRED**:
                   - Every 'definition' MUST be written in fluent Turkish.
                   - Every English 'example' MUST include its Turkish translation in parentheses.
                2. **LEMMA (ROOT) IDENTIFICATION**:
                   - Always use the base root form (lemma) of the word.

                ### JSON STRUCTURE:
                Return a JSON array of objects:
                [
                  {
                    "word": "base_root",
                    "difficulty": "B1",
                    "meanings": [
                      {
                        "pos": "verb",
                        "definition": "Tanım burada.",
                        "example": "Example sentence. (Örnek cümle çevirisi.)"
                      }
                    ],
                    "phrasal_verbs": [],
                    "verb_forms": null
                  }
                ]
                """;

        String userPrompt = String.format(
                """
                        ENRICH THE FOLLOWING WORDS BASED ON THEIR CONTEXT:

                        %s

                        Provide the JSON array now:
                        """,
                batchDetails.toString());

        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                String response = generateContent(systemPrompt + "\n\n" + userPrompt, PIPELINE_MODEL);
                if (response == null) {
                    Thread.sleep(2000);
                    continue;
                }

                String cleanResponse = response.replace("```json", "").replace("```", "").trim();
                log.info("Gemini Worker raw response for batch: {}", cleanResponse);
                List<WordDefinition> definitions = objectMapper.readValue(cleanResponse,
                        new com.fasterxml.jackson.core.type.TypeReference<List<WordDefinition>>() {
                        });
                log.info("Gemini Worker parsed {} definitions", definitions.size());

                Map<String, WordDefinition> result = new HashMap<>();
                for (int i = 0; i < Math.min(words.size(), definitions.size()); i++) {
                    result.put(words.get(i).getWord(), definitions.get(i));
                }
                return result;
            } catch (Exception e) {
                log.warn("Gemini Worker failed batch enrichment (Attempt {}). Error: {}", attempt, e.getMessage());
            }
        }
        return Map.of();
    }

    public Map<String, com.sublex.model.WordDefinition> fixWordsBatch(List<com.sublex.model.Word> words) {
        if (words == null || words.isEmpty())
            return Map.of();

        log.info("Gemini Specialist fixing batch of {} words", words.size());

        StringBuilder batchDetails = new StringBuilder();
        for (int i = 0; i < words.size(); i++) {
            com.sublex.model.Word w = words.get(i);
            batchDetails
                    .append(String.format("%d. WORD: \"%s\", REASON: \"%s\"\n", i + 1, w.getWord(), w.getAuditNotes()));
        }

        String systemPrompt = """
                You are a meticulous Senior Lexicographer and Turkish Language Expert.
                Your mission is to fix rejected dictionary entries with 100% linguistic accuracy.

                ### MANDATORY QUALITY CONTROLS:
                1. **TURKISH TRANSLATION IS STRICTLY REQUIRED**:
                   - Every 'definition' MUST be written in fluent Turkish.
                   - Every English 'example' MUST include its Turkish translation in parentheses.
                2. **ROOT MATCHING (CRITICAL)**:
                   - If the rejection reason is 'Root mismatch', you MUST change the "word" field in the JSON to the correct base root. Do not define the past tense or plural form!

                ### JSON STRUCTURE (STRICTLY FOLLOW THIS FORMAT):
                Return a JSON array of objects, each corresponding to one of the requested words:
                [
                  {
                    "word": "örnek_kelimenin_dogru_kökü",
                    "difficulty": "B2",
                    "meanings": [
                      {
                        "pos": "verb",
                        "definition": "Bir şeyi göstermek veya örnek teşkil etmek.",
                        "example": "He exemplified the behavior. (O, bu davranışı örnekledi.)"
                      }
                    ],
                    "phrasal_verbs": [],
                    "verb_forms": null
                  }
                ]
                Return ONLY the JSON array. No conversational filler.
                """;

        String userPrompt = String.format(
                """
                        STRICT RECTIFICATION REQUIRED FOR THE FOLLOWING WORDS:

                        %s

                        Provide the corrected JSON array now:
                        """,
                batchDetails.toString());

        String fullPrompt = systemPrompt + "\n\n" + userPrompt;

        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                String response = generateContent(fullPrompt, SPECIALIST_MODEL);
                if (response == null)
                    continue;

                String cleanResponse = response.replace("```json", "").replace("```", "").trim();
                List<com.sublex.model.WordDefinition> definitions = objectMapper.readValue(cleanResponse,
                        new com.fasterxml.jackson.core.type.TypeReference<List<com.sublex.model.WordDefinition>>() {
                        });

                Map<String, com.sublex.model.WordDefinition> result = new HashMap<>();
                // Note: We'll map them by the original word requested to help SpecialistService
                // find them
                for (int i = 0; i < Math.min(words.size(), definitions.size()); i++) {
                    result.put(words.get(i).getWord(), definitions.get(i));
                }
                return result;

            } catch (Exception e) {
                log.warn("Gemini Specialist failed batch fix (Attempt {}). Error: {}", attempt, e.getMessage());
            }
        }
        return Map.of();
    }

    public com.sublex.model.WordDefinition fixWord(String word, String auditNotes) {
        log.info("Gemini Specialist fixing word: '{}' because: {}", word, auditNotes);

        String systemPrompt = """
                You are a meticulous Senior Lexicographer and Turkish Language Expert.
                Your mission is to fix rejected dictionary entries with 100% linguistic accuracy.

                ### MANDATORY QUALITY CONTROLS:
                1. **TURKISH TRANSLATION IS STRICTLY REQUIRED**:
                   - Every 'definition' MUST be written in fluent Turkish.
                   - Every English 'example' MUST include its Turkish translation in parentheses.
                2. **ROOT MATCHING (CRITICAL)**:
                   - If the rejection reason is 'Root mismatch', you MUST change the "word" field in the JSON to the correct base root. Do not define the past tense or plural form!

                ### JSON STRUCTURE (STRICTLY FOLLOW THIS FORMAT):
                {
                  "word": "örnek_kelimenin_dogru_kökü",
                  "difficulty": "B2",
                  "meanings": [
                    {
                      "pos": "verb",
                      "definition": "Bir şeyi göstermek veya örnek teşkil etmek.",
                      "example": "He exemplified the behavior. (O, bu davranışı örnekledi.)"
                    }
                  ],
                  "phrasal_verbs": [],
                  "verb_forms": null
                }
                Return ONLY a single valid JSON object. No conversational filler.
                """;

        String userPrompt = String.format(
                """
                        STRICT RECTIFICATION REQUIRED:

                        1. REJECTED WORD: "%s"
                        2. REJECTION REASON: "%s"

                        ACTION PLAN:
                        - If the reason is 'Typo', perform a spelling audit.
                        - If the reason is 'Natural translation', replace robotic phrasing with idiomatic Turkish.
                        - If the reason is 'Inaccurate definition', re-research the word domain (e.g., tech, nature).

                        Provide the corrected JSON now:
                        """,
                word, auditNotes);

        String fullPrompt = systemPrompt + "\n\n" + userPrompt;

        // RETRY MECHANISM (3 Attempts)
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                String response = generateContent(fullPrompt, SPECIALIST_MODEL);
                if (response == null)
                    continue;

                log.info("Gemini Specialist response for {} (Attempt {}): {}", word, attempt, response);

                return objectMapper.readValue(response, com.sublex.model.WordDefinition.class);

            } catch (Exception e) {
                log.warn("Gemini Specialist failed to fix word: {} (Attempt {}). Error: {}", word, attempt,
                        e.getMessage());
                if (attempt == 3) {
                    log.error("Final Gemini attempt failed for word: {}", word, e);
                }
            }
        }
        return null;
    }
}
