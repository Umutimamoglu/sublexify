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
public class OpenAIService implements AIService {

        @Value("${OPENAI_API_KEY}")
        private String apiKey;

        private final ObjectMapper objectMapper = new ObjectMapper();
        private final RestClient restClient = RestClient.create();

        private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
        private static final String MODEL = "gpt-4o-mini";

        @Override
        public WordDefinition enrichWord(String word) {
                log.info("Enriching word via OpenAI: {}", word);

                String prompt = String.format(
                                """
                                                You are a Professional English-to-Turkish Lexicographer and Language Purist.
                                                Analyze the English word or term '%s'.

                                                Return a JSON object with:
                                                1. 'word': the word itself.
                                                2. 'difficulty': CEFR level (A1-C2).
                                                3. 'verb_forms': If the word is a verb, provide 'v1', 'v2', 'v3', and 'ing' forms. Otherwise, return null.
                                                4. 'meanings': Array of objects, grouped by Part of Speech. For each POS, provide the most common 1-2 meanings.
                                                   - 'pos': part of speech in English (noun, verb, adj, etc.)
                                                   - 'definition': Short, clear, and NATURAL definition IN TURKISH. Explain slang or loanword context in Turkish.
                                                   - 'example': One example sentence in English, with its COMPLETE TURKISH translation in parentheses.
                                                5. 'phrasal_verbs': Array of 2-3 common phrasal verbs (if any).
                                                   - 'phrase': the phrasal verb.
                                                   - 'definition': short definition IN TURKISH.
                                                   - 'example': One example sentence in English, with its COMPLETE TURKISH translation in parentheses.

                                                CRITICAL RULES FOR TURKISH TRANSLATIONS:
                                                - TARGET AUDIENCE: Someone who knows ZERO English.
                                                - RULE: The Turkish sentence in parentheses MUST be 100%% natural Turkish.
                                                - STRICTLY FORBIDDEN: Do not leave the target English word untranslated inside the parentheses.
                                                - STRICTLY FORBIDDEN: Do not mix English words with Turkish suffixes (e.g., NO "shooting'i", "fess up yaptı", "fiyatlar shoot up oldu").
                                                - NUMERICAL ACCURACY: If the word represents a number, fraction, or quantity (e.g., 'billionth', 'half'), the translation MUST be mathematically precise. 'Billionth' is 'milyarda bir', NOT 'binde bir'.
                                                - DEFINITIONS MUST BE SIMPLE: Use concrete, everyday Turkish words suitable for a primary school student. Avoid abstract or philosophical terms like 'fenomen', 'kavram', 'tezahür'.

                                                FEW-SHOT EXAMPLES (WRONG VS RIGHT):
                                                - WRONG: (Dağcılar arroyo'yu takip etti.) -> RIGHT: (Dağcılar kuru dere yatağını takip etti.)
                                                - WRONG: (Bir milyar saniyenin binde biri...) -> RIGHT: (Saniyenin milyarda biri...)
                                                - WRONG: (Filmin shooting'i several ay sürdü.) -> RIGHT: (Filmin çekimleri birkaç ay sürdü.)
                                                - WRONG: (O, hedefe shooting yapıyordu.) -> RIGHT: (O, hedefe ateş ediyordu.)
                                                - WRONG: (Fiyatlar shoot up oldu.) -> RIGHT: (Fiyatlar hızla yükseldi.)

                                                Ensure the JSON matches this structure exactly:
                                                {
                                                  "word": "...",
                                                  "difficulty": "...",
                                                  "verb_forms": { "v1": "...", "v2": "...", "v3": "...", "ing": "..." },
                                                  "meanings": [{ "pos": "...", "definition": "...", "example": "..." }],
                                                  "phrasal_verbs": [{ "phrase": "...", "definition": "...", "example": "..." }]
                                                }
                                                """,
                                word);

                try {
                        Map<String, Object> requestBody = Map.of(
                                        "model", MODEL,
                                        "temperature", 0.2,
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
