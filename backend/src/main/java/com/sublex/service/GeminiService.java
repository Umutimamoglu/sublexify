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
    public static final String SPECIALIST_MODEL = "gemini-3-pro-preview";
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

    public com.sublex.model.WordDefinition fixWord(String word, String auditNotes) {
        log.info("Gemini Specialist fixing word: '{}' because: {}", word, auditNotes);

        String systemPrompt = """
                You are a meticulous Senior Lexicographer and Turkish Language Expert.
                Your mission is to fix rejected dictionary entries with 100% linguistic accuracy.

                ### MANDATORY QUALITY CONTROLS:
                1. **NATURE & SCIENCE (The "Swift" Rule)**:
                   - Before defining animals/plants, verify their exact Turkish name.
                   - Example: 'Swift' is 'Ebabil' or 'Sağan', NEVER 'Çakır'.
                2. **SPELLING & TYPOS**:
                   - Perform a character-by-character check.
                   - Avoid double consonants where not required (e.g., use 'devretti', NOT 'devrettti').
                   - Ensure Turkish characters (ı, i, ğ, ü, ş, ö) are used correctly (e.g., NOT 'tatılı').
                3. **NATURAL COLLOCATIONS (The "Scratch" Rule)**:
                   - Do not use robot-speak like 'çizik yaptı'. Use natural verbs: 'tırmaladı', 'çizdi', 'hasar verdi'.
                   - Avoid ending definitions with "...yapılan şeydir/kişidir". Use direct, dictionary-style nouns/verbs.
                4. **SUFFIX INTEGRITY**:
                   - When translating example sentences, check the noun cases (Ablative -den, Dative -e, etc.).
                   - 'Left the room' -> 'OdadAN ayrıldı' (Correct case suffix).
                5. **PHRASAL VERB RULES (STRICT)**:
                   - Do NOT invent phrasal verbs that don't exist (e.g., 'need up', 'fasten up').
                   - If unsure whether a phrasal verb exists, omit it entirely.
                   - Only include phrasal verbs you are 100% certain exist in standard English dictionaries.

                ### JSON STRUCTURE (STRICTLY FOLLOW THIS FORMAT):
                {
                  "word": "example",
                  "difficulty": "B2",
                  "meanings": [
                    {
                      "pos": "verb",
                      "definition": "To show something.",
                      "example": "He exemplified the behavior."
                    }
                  ],
                  "phrasal_verbs": [
                    {
                      "phrase": "example out",
                      "definition": "To remove by example.",
                      "example": "She exampled him out."
                    }
                  ],
                  "verb_forms": {
                    "v1": "example",
                    "v2": "exampled",
                    "v3": "exampled",
                    "ing": "exampling"
                  }
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
