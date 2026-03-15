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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

@Service
@Slf4j
public class OpenAIService implements AIService {

        @Value("${OPENAI_API_KEY}")
        private String apiKey;

        private final ObjectMapper objectMapper = new ObjectMapper();
        private final RestClient restClient;

        public OpenAIService(@Value("${OPENAI_API_KEY}") String apiKey) {
                this.apiKey = apiKey;
                this.restClient = RestClient.builder()
                                .requestFactory(new org.springframework.http.client.SimpleClientHttpRequestFactory() {
                                        {
                                                setConnectTimeout(60000);
                                                setReadTimeout(60000);
                                        }
                                })
                                .build();
        }

        private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
        private static final String MODEL = "gpt-5-mini";

        // CACHING OPTIMIZATION: Static System Instructions for Prefix Caching
        private static final String SYSTEM_INSTRUCTIONS = """
                        You are a Professional English-to-Turkish Lexicographer and Language Purist.

                        Return a JSON object with:
                        1. 'word': the word itself.
                        2. 'difficulty': CEFR level (A1-C2). Use the provided level EXACTLY.
                        3. 'verb_forms': If any meaning of the word has "pos": "verb", you MUST provide 'v1', 'v2', 'v3', and 'ing' forms. CRITICAL: These fields MUST NEVER be null or empty if it is a verb. Otherwise, if not a verb, return null for the whole object.
                        4. 'meanings': Array of objects, grouped by Part of Speech.
                           - For each POS, provide the most common 1-2 meanings.
                           - SEMANTIC UNIQUENESS (CRITICAL): Do NOT provide meanings that are near-synonyms or redundant. If a word primarily has one meaning, provide ONLY ONE meaning.
                           - NO NESTED LISTS (CRITICAL): Each 'definition' must be a SINGLE string. Do NOT use numbered lists (e.g., '1)... 2)...') or bullet points inside a definition. Use separate entries in the 'meanings' array instead.
                           - 'pos': part of speech in English (noun, verb, adjective, adverb, number, etc.)
                           - 'definition': Short, clear, and NATURAL definition IN TURKISH. Explain slang or loanword context in Turkish.
                           - 'example': One example sentence in English, with its COMPLETE TURKISH translation in parentheses.
                        5. 'phrasal_verbs': Array of common phrasal verbs. return an empty array [] if none exist. Do NOT force or invent phrasal verbs for words like 'tea' or 'ketchup'.
                           - 'phrase': the phrasal verb itself (e.g., 'look up'). CRITICAL: This field MUST NEVER be null or empty.
                           - 'definition': short definition IN TURKISH.
                           - 'example': One example sentence in English, with its COMPLETE TURKISH translation in parentheses.

                        CRITICAL RULES FOR TURKISH TRANSLATIONS:
                        - TARGET AUDIENCE: Someone who knows ZERO English.
                        - RULE: The Turkish sentence in parentheses MUST be 100% natural Turkish.
                        - STRICTLY FORBIDDEN: Do not leave the target English word untranslated inside the parentheses.
                        - STRICTLY FORBIDDEN: Do not mix English words with Turkish suffixes (e.g., NO "shooting'i", "fess up yaptı", "fiyatlar shoot up oldu").
                        - NUMERICAL ACCURACY: If the word represents a number, fraction, or quantity (e.g., 'billionth', 'half'), the translation MUST be mathematically precise. 'Billionth' is 'milyarda bir', NOT 'binde bir'.
                        - DEFINITIONS MUST BE SIMPLE: Use concrete, everyday Turkish words suitable for a primary school student. Avoid abstract or philosophical terms like 'fenomen', 'kavram', 'tezahür'.
                        - CEFR LEVEL CONSISTENCY: The provided CEFR difficulty level applies to the ENTIRE entry. The definitions and example sentences MUST be written appropriately for a student at this exact level. Do not use complex C1 grammar for an A1 word, and do not use overly simplistic structures for a B2 word.
                        - HOMONYM ANTI-POLLUTION (CRITICAL): Only include meanings directly related to the semantic context of the target word. If the root word has unrelated homonyms (e.g., word is 'mining', root is 'mine', but the pronoun 'mine/benimki' is unrelated to 'madencilik'), you MUST EXCLUDE the unrelated homonyms. NO "benimki" in "mining". NO "kalem" (pen) in "penthouse". NO "teneke" (can) in "cancel".

                        FEW-SHOT EXAMPLES (WRONG VS RIGHT):
                        - WRONG (Redundancy): Meaning 1: "bilgisayar sitesi", Meaning 2: "web sayfası" -> RIGHT: Use only "web sitesi" as a single meaning.
                        - WRONG (List in string): "1) temizlemek 2) süpürmek" -> RIGHT: Separate into two distinct meaning objects in the array.
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

                        ### LEXICOGRAPHICAL COMPLETENESS RULES:
                        1. **MEANING COMPLETENESS (CRITICAL)**:
                           - Provide all primary meanings of the word across different Parts of Speech IF they are common.
                           - Example: 'will' -> [modal] gelecek zaman eki, [noun] irade, [noun] vasiyet. (TÜMÜ TÜRKÇE OLMALI).
                        2. **HIGH-FREQUENCY MULTI-POS WORDS**:
                           - For common words (can, may, might, will, bound, present, etc.), provide all primary POS meanings.
                        3. **PAST PARTICIPLE ADJECTIVES**:
                           - For words like 'titled', 'troubled', include both the specific adjective and verb-result meanings.
                        4. **NO PROPER NOUN FILTERING (BRAVE MODE)**:
                           - These words have ALREADY passed a preliminary name filter.
                           - Do NOT skip a word or provide a hollow definition just because it might be a name.
                           - Words like 'Scotch', 'Hefty', 'Baller', 'Canon', 'Apple', 'Will' MUST be defined using their common English dictionary meanings.
                           - Only use `pos: "proper noun"` if the word is STRICTLY a brand or person name with NO common dictionary meaning.
                        5. **STRICT TURKISH DEFINITION**:
                           - Every 'definition' MUST be written in fluent Turkish. NO ENGLISH definitions.
                        """;

        @Override
        public WordDefinition enrichWord(String word, String difficulty, String contextSentence) {
                log.info("Enriching word via OpenAI: {} (Difficulty: {})", word, difficulty);

                String promptContext = contextSentence != null && !contextSentence.isBlank()
                                ? " Context sentence from media: '" + contextSentence + "'."
                                : "";

                String userPrompt = String.format(
                                "Analyze the English word or term '%s'. Its difficulty level is already determined as: %s.%s Return the JSON response matching the required structure.",
                                word, difficulty, promptContext);

                try {
                        Map<String, Object> requestBody = Map.of(
                                        "model", MODEL,
                                        "messages", List.of(
                                                        Map.of("role", "system", "content", SYSTEM_INSTRUCTIONS),
                                                        Map.of("role", "user", "content", userPrompt)),
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

                        WordDefinition def = objectMapper.readValue(content, WordDefinition.class);
                        if (difficulty != null && !difficulty.isBlank()) {
                                def.setDifficulty(difficulty);
                        }
                        return def;

                } catch (Exception e) {
                        log.error("Failed to enrich word: {}", word, e);
                        return null;
                }
        }

        @Override
        public WordDefinition enrichTrustedWord(String word, String difficulty, String contextSentence) {
                log.info("Trusted enrichment for Oxford word: {} ({})", word, difficulty);

                String promptContext = contextSentence != null && !contextSentence.isBlank()
                                ? " Use this original context sentence to prioritize its meaning: '" + contextSentence
                                                + "'. "
                                : "";

                String userPrompt = String.format(
                                "The English word is '%s'. " +
                                                "Its CEFR level is EXACTLY '%s' (Oxford verified - DO NOT change it). "
                                                +
                                                promptContext +
                                                "DO NOT re-evaluate the level. DO NOT change the root word. " +
                                                "ONLY provide a natural Turkish definition and one example sentence. " +
                                                "Return JSON matching the required structure.",
                                word, difficulty);

                try {
                        Map<String, Object> requestBody = Map.of(
                                        "model", MODEL,
                                        "messages", List.of(
                                                        Map.of("role", "system", "content", SYSTEM_INSTRUCTIONS),
                                                        Map.of("role", "user", "content", userPrompt)),
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

                        WordDefinition def = objectMapper.readValue(content, WordDefinition.class);

                        // Oxford seviyesini zorla — AI değiştirmiş olsa bile geri yaz
                        def.setDifficulty(difficulty);

                        return def;

                } catch (Exception e) {
                        log.error("Trusted enrichment failed for word: {}", word, e);
                        return null;
                }
        }

        @Override
        public Map<String, WordDefinition> enrichWordsBatch(List<Word> words) {
                Map<String, WordDefinition> results = new ConcurrentHashMap<>();

                try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
                        for (Word word : words) {
                                executor.submit(() -> {
                                        WordDefinition def = enrichWord(word.getWord(), word.getDifficulty(),
                                                        word.getContextSentence());
                                        if (def != null) {
                                                results.put(word.getWord(), def);
                                        }
                                });
                        }
                }
                return results;
        }
}
