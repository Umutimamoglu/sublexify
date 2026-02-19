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
    private final RestClient restClient = RestClient.builder()
            .requestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory(
                    java.net.http.HttpClient.newBuilder()
                            .connectTimeout(java.time.Duration.ofSeconds(10))
                            .build()))
            .build();

    private static final String ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
    private static final String CLAUDE_MODEL = "claude-sonnet-4-6";

    public WordDefinition fixWord(String word, String auditNotes) {
        log.info("Claude Specialist fixing word: '{}' because: {}", word, auditNotes);

        // SYSTEM PROMPT: Kurallar + ÖRNEKLER (Few-Shot) - ENHANCED FOR LINGUISTIC RIGOR
        // & ROBUSTNESS
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
                      "pos": "verb",  // MUST be 'pos', not 'type' or 'partOfSpeech'
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
                Ensure 'difficulty' matches the context of the word's usage.
                """;

        // USER PROMPT: Denetçi notunu vurgula - ENHANCED FOR CONTEXTUAL REJECTION
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

        // CACHING ENABLED: System prompt sent as structured object
        List<Map<String, Object>> systemMessage = List.of(
                Map.of(
                        "type", "text",
                        "text", systemPrompt,
                        "cache_control", Map.of("type", "ephemeral")));

        Map<String, Object> requestBody = Map.of(
                "model", CLAUDE_MODEL,
                "max_tokens", 2048,
                "system", systemMessage,
                "messages", List.of(
                        Map.of("role", "user", "content", userPrompt)));

        // RETRY MECHANISM (3 Attempts)
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                String response = restClient.post()
                        .uri(ANTHROPIC_URL)
                        .header("x-api-key", apiKey)
                        .header("anthropic-version", "2023-06-01")
                        .header("anthropic-beta", "prompt-caching-2024-07-31") // Caching Header
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody)
                        .retrieve()
                        .body(String.class);

                Map<String, Object> responseMap = objectMapper.readValue(response, Map.class);
                List<Map<String, Object>> contentList = (List<Map<String, Object>>) responseMap.get("content");
                String content = (String) contentList.get(0).get("text");

                log.info("Claude raw response for {} (Attempt {}): {}", word, attempt, content);

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

                WordDefinition result = objectMapper.readValue(jsonContent, WordDefinition.class);

                // VALIDATION: Null Meanings Check
                if (result.getMeanings() == null || result.getMeanings().isEmpty()) {
                    log.warn("Specialist returned null/empty meanings for word: {} (Attempt {})", word, attempt);
                    continue; // Retry
                }

                return result;

            } catch (org.springframework.web.client.HttpClientErrorException e) {
                log.error("Anthropic API Error ({}): {}", e.getStatusCode(), e.getResponseBodyAsString());
                return null;
            } catch (Exception e) {
                log.warn("Claude Specialist failed to fix word: {} (Attempt {}). Error: {}", word, attempt,
                        e.getMessage());
                if (attempt == 3) {
                    log.error("Final attempt failed for word: {}", word, e);
                    return null;
                }
            }
        }
        return null;
    }
}
