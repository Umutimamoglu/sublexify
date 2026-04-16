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
                            .build()) {
                {
                    setReadTimeout(java.time.Duration.ofSeconds(180));
                }
            })
            .build();

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    // User requested "3 pro" i.e., gemini-3-pro-preview for Sheriff
    // For Pipeline, "3 flash" likely refers to gemini-2.0-flash as it is the
    // current flash preview/model
    public static final String SHERIFF_MODEL = "gemini-2.5-flash";
    public static final String PIPELINE_MODEL = "gemini-2.5-pro";
    public static final String SPECIALIST_MODEL = "gemini-2.5-pro";
    public static final String ANALYSIS_MODEL = "gemini-2.5-flash";
    private static final String DEFAULT_MODEL = PIPELINE_MODEL;

    public List<com.sublex.dto.WordAnalysisResultDTO> analyzeWordsWithContext(
            List<com.sublex.dto.WordContextDTO> words) {
        if (words == null || words.isEmpty()) {
            return List.of();
        }

        try {
            String jsonInput = objectMapper.writeValueAsString(words);
            String systemPrompt = """
                            Sana bir kelime listesi ve bağlam cümleleri veriyorum. Her kelime için:
                            1. Cümledeki kullanımına bakarak kelimenin sözlük kökünü (lemma) bul.
                               - Eğer kelime bir isim veya sıfat olarak kalıplaşmışsa (örn: 'meeting' -> Toplantı, 'building' -> Bina), kökünü BOZMA, aynen bırak.
                               - Eğer fiil çekimiyse (örn: 'is meeting' -> meet), kökünü fiil olarak bul.
                               - Eğer kelime kesme işareti veya tire içeriyorsa (örn: 'don't', 'long-term'), bunu tek bir bütün olarak ele al ve bağlama göre en uygun kökü bul (örn: 'don't' -> 'do', 'long-term' -> 'long-term').
                            2. Kelimenin zorluk seviyesini (A1, A2, B1, B2, C1, C2) belirle.
                               - DİKKAT: Ana akım konuşma dilinde çok nadir kullanılan, edebi, karmaşık, akademik veya oldukça spesifik bir nüansı olan kelimeleri C1'e indirme, onları cesurca 'C2' olarak işaretle (Örn: ubiquitous, ephemeral, fastidious, sycophant, idiosyncratic vb.).
                            3. Özel isim tespiti (is_proper_noun):
                               Aşağıdaki kategorilere giren ve İngilizcede başka yaygın bir sözlük anlamı (fiil, sıfat, genel isim vb.) BULUNMAYAN kelimeleri MUTLAKA 'is_proper_noun: true' olarak işaretle:
                                - Kişi adları ve soyadları (örn: belushi, poitier, stevens, clark, morgan, brady, stearn, kurtz, jasper, levi, rockwell)
                                - Şehir, eyalet, ülke ve yer adları (örn: omaha, danville, paris, brooklyn)
                                - Marka, şirket ve müzik grubu adları (örn: porsche, purina, playboy, nike, radiohead)
                                - Film, dizi, karakter adları (örn: bambi, terminator, gandalf, elric)
                                - Uydurma/kurgu özel isimleri (örn: friesenstinlender, lecroix)
                                DİKKAT: Kelimeler küçük harfle yazılmış olabilir.
                                ALTIN KURAL: Eğer bir kelimenin yaygın bir sözlük anlamı varsa (örn: 'hefty', 'scotch', 'will', 'can', 'bridge') ve bağlamda bir özel isim olarak KESİN olarak (büyük harfle başlama, unvan eşlik etmesi vb.) kullanılmıyorsa özel isim İŞARETLEME.
                                HYPHENATED INTEGRITY: Treat long hyphenated strings (e.g., 'married-to-the-job', 'once-in-a-lifetime') as a SINGLE concept/word. Do not break them up into fragments.
                            4. Dil Tespiti (language):
                               Kelimenin hangi dilde olduğunu tespit et.
                               - Eğer kelime İngilizce ise veya yaygın bir İngilizce alıntı kelime (loanword - örn: café, taco, sushi) ise 'en' olarak işaretle.
                               - Eğer kelime KESİN olarak başka bir dilde (İspanyolca, Fransızca, Vietnamca, Almanca vb.) ve İngilizce sözlüklerde yaygın değilse, o dilin ISO kodunu ver (es, fr, vi, de, it vb.).

                            Çıktıyı şu JSON formatında bir liste olarak ver:
                            [
                              { "word": "meeting", "root": "meeting", "difficulty": "B1", "is_proper_noun": false, "language": "en" },
                              { "word": "mija", "root": "mija", "difficulty": "A1", "is_proper_noun": false, "language": "es" }
                            ]
                            Sadece JSON dizisi döndür.
                            """;

            String userPrompt = String.format("Girdi JSON:\n%s", jsonInput);

            String response = generateContent(systemPrompt, userPrompt, ANALYSIS_MODEL);
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
        return generateContent(null, prompt, model);
    }

    public String generateContent(String systemPrompt, String userPrompt, String model) {
        if (apiKey == null || apiKey.isEmpty()) {
            log.error("GEMINI_API_KEY is missing from environment!");
            return null;
        }
        log.info("Calling Gemini API with model: {} (Key length: {})", model, apiKey.length());

        Map<String, Object> contents = Map.of("parts", List.of(Map.of("text", userPrompt)));

        Map<String, Object> requestBodyMap = new HashMap<>();
        requestBodyMap.put("contents", List.of(contents));

        if (systemPrompt != null && !systemPrompt.isEmpty()) {
            requestBodyMap.put("system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))));
        }

        requestBodyMap.put("generationConfig", Map.of(
                "temperature", 0.1,
                "response_mime_type", "application/json"));

        try {
            String jsonBody = objectMapper.writeValueAsString(requestBodyMap);
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

            return rawText;

        } catch (Exception e) {
            log.error("Gemini API call failed. Model: {}. Error: {}", model, e.getMessage(), e);
            return null;
        }
    }

    @Override
    public WordDefinition enrichWord(String word, String difficulty, String contextSentence) {
        // Individual enrichment using Gemini Pro/Flash
        return fixWord(word, "Initial orientation Context: " + contextSentence,
                "Enriching dictionary entry definition and example");
    }

    @Override
    public WordDefinition enrichTrustedWord(String word, String difficulty, String contextSentence) {
        // Simple delegator for now to satisfy interface
        return enrichWord(word, difficulty, contextSentence);
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
                   - **CONCISE DEFINITIONS (CRITICAL)**: Use the shortest, most direct Turkish equivalent. Do NOT write encyclopedic explanations.
                     - WRONG: "Motorlu, dört tekerlekli, insanları taşımak için kullanılan kara taşıtı." → RIGHT: "Araba, otomobil."
                     - WRONG: "Üzerine eşya koyulan dört ayaklı mobilya." → RIGHT: "Masa."
                     - RULE: If a Turkish person would answer with ONE WORD, use that one word. For rare/complex words (C1/C2), a brief explanation is acceptable.
                2. **LEMMA (ROOT) IDENTIFICATION**:
                   - Always use the base root form (lemma) of the word.
                3. **CONTEXT SENSITIVITY (CRITICAL)**:
                   - You MUST prioritize the meaning that fits the provided 'CONTEXT'.
                   - For example, if 'squash' is provided with a cooking context, do NOT define it as a sport.
                   - If 'terminator' has a movie context, do NOT provide obscure astronomical definitions.
                4. **NO PROPER NOUN FILTERING (BRAVE MODE)**:
                   - These words have ALREADY passed a preliminary name filter.
                   - Do NOT skip a word or provide a hollow definition just because it might be a name.
                   - Words like 'Scotch', 'Hefty', 'Baller', 'Canon', 'Apple', 'Will' MUST be defined using their common English dictionary meanings.
                   - Only use `pos: "proper noun"` if the word is STRICTLY a brand or person name with NO common dictionary meaning (e.g., 'Google', 'Statham').
                5. **NO NULL LISTS (CRITICAL)**:
                   - If there are no `phrasal_verbs` or `meanings` to add, you MUST return an empty list `[]`.
                   - Do NOT use `null` for list fields.

                ### LEXICOGRAPHICAL COMPLETENESS RULES:
                1. **MEANING COMPLETENESS**:
                   - Provide all primary meanings of the word across different Parts of Speech IF they are common.
                   - Example: 'will' -> [modal] gelecek zaman eki, [noun] irade, [noun] vasiyet. (TÜMÜ TÜRKÇE OLMALI).
                2. **HIGH-FREQUENCY MULTI-POS WORDS**:
                   - For common words (can, may, might, will, bound, present, etc.), always provide at least one noun and one verb/adjective meaning if applicable.
                3. **PAST PARTICIPLE ADJECTIVES**:
                   - Check for words used as adjectives that are also past participles (e.g., 'titled', 'troubled', 'titled').
                   - Include both the specific adjective meaning (örn: 'titled' -> asilzade ünvanı olan) and the verb's result meaning (örn: 'titled' -> başlık verilmiş).
                4. **HYPHENATED INTEGRITY**:
                   - If the word is a hyphenated phrase (e.g., 'married-to-the-job', 'once-in-a-lifetime'), you MUST provide the meaning for the WHOLE phrase.
                   - Do NOT define individual parts.
                5. **STRICT TURKISH DEFINITION**:
                   - Even in these rules, all definitions MUST be in Turkish.

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

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String response = generateContent(systemPrompt, userPrompt, PIPELINE_MODEL);
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

                Map<String, WordDefinition> result = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
                for (WordDefinition def : definitions) {
                    if (def.getWord() != null) {
                        result.put(def.getWord(), def);
                    }
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

        StringBuilder batchInput = new StringBuilder();
        for (int i = 0; i < words.size(); i++) {
            com.sublex.model.Word w = words.get(i);
            batchInput.append(String.format("%d. WORD: \"%s\", REASON: \"%s\", CONTEXT: \"%s\"\n",
                    i + 1, w.getWord(), w.getAuditNotes(),
                    w.getContextSentence() != null ? w.getContextSentence() : ""));
        }

        String systemPrompt = """
                You are a meticulous Senior Lexicographer and Turkish Language Expert.
                Your mission is to fix rejected dictionary entries with 100% linguistic accuracy.

                ### MANDATORY QUALITY CONTROLS:
                1. **TURKISH TRANSLATION IS STRICTLY REQUIRED**:
                   - Every 'definition' MUST be written in fluent Turkish.
                   - Every English 'example' MUST include its Turkish translation in parentheses.
                   - **CONCISE DEFINITIONS (CRITICAL)**: Use the shortest, most direct Turkish equivalent. Do NOT write encyclopedic explanations.
                     - WRONG: "Motorlu, dört tekerlekli, insanları taşımak için kullanılan kara taşıtı." → RIGHT: "Araba, otomobil."
                     - RULE: If a Turkish person would answer with ONE WORD, use that one word.
                2. **ROOT MATCHING (CRITICAL)**:
                   - If the rejection reason is 'Root mismatch', you MUST change the "word" field in the JSON to the correct base root. Do not define the past tense or plural form!
                3. **SEMANTIC UNIQUENESS (CRITICAL)**:
                   - Do NOT provide redundant or near-identical meanings. If a word primarily has one meaning, provide ONLY ONE.
                4. **NO NESTED LISTS (CRITICAL)**:
                   - Each 'definition' must be a SINGLE string. Do NOT use numbered lists (e.g., "1) ... 2) ...") inside a definition string. Use separate objects in the 'meanings' array instead.
                5. **STRICT VERB FORM KEYS (CRITICAL)**:
                   - You MUST use keys `v1`, `v2`, `v3`, and `ing` for the `verb_forms` object.
                   - Do NOT use `present`, `past`, `participle`. Use `v1`, `v2`, `v3`, `ing`.
                6. **PROPER NOUN LABELING**:
                   - Every word identified as a Name, Place, Brand, or Person MUST have `pos: "proper noun"`.
                7. **PROPER NOUN LABELING**:
                   - Every word identified as a Name, Place, Brand, or Person MUST have `pos: "proper noun"`.
                8. **NO NULL LISTS (CRITICAL)**:
                   - If there are no `phrasal_verbs` or `meanings` to add, you MUST return an empty list `[]`.
                   - Do NOT use `null` for list fields.

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
                    "phrasal_verbs": [
                      {
                        "phrase": "exemplify by",
                        "definition": "Bir şey ile örneklendirmek.",
                        "example": "He exemplified the rule by giving an example. (Bir örnek vererek kuralı temellendirdi.)"
                      }
                    ],
                    "verb_forms": {
                      "v1": "exemplify",
                      "v2": "exemplified",
                      "v3": "exemplified",
                      "ing": "exemplifying"
                    }
                  }
                ]
                You are the 'Specialist', an expert lexicographer.
                The following words were REJECTED by the Sheriff. You must fix them.

                ### RULES:
                1. **CONTEXTUAL ALIGNMENT (CRITICAL)**: For each word, look at the 'CONTEXT' provided. The definition MUST match how the word is used in that sentence.
                2. **STRICT FORMATTING**: Return ONLY a JSON array.
                No conversational filler.
                """;

        String userPrompt = String.format(
                """
                        STRICT RECTIFICATION REQUIRED FOR THE FOLLOWING WORDS:

                        %s

                        Provide the corrected JSON array now:
                        """,
                batchInput.toString());

        String fullPrompt = systemPrompt + "\n\n" + userPrompt;

        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String response = generateContent(systemPrompt, userPrompt, SPECIALIST_MODEL);
                if (response == null)
                    continue;

                String cleanResponse = response.replace("```json", "").replace("```", "").trim();
                List<com.sublex.model.WordDefinition> definitions = objectMapper.readValue(cleanResponse,
                        new com.fasterxml.jackson.core.type.TypeReference<List<com.sublex.model.WordDefinition>>() {
                        });

                Map<String, com.sublex.model.WordDefinition> result = new java.util.TreeMap<>(
                        String.CASE_INSENSITIVE_ORDER);
                for (com.sublex.model.WordDefinition def : definitions) {
                    if (def.getWord() != null) {
                        result.put(def.getWord(), def);
                    }
                }
                return result;

            } catch (Exception e) {
                log.warn("Gemini Specialist failed batch fix (Attempt {}). Error: {}", attempt, e.getMessage());
            }
        }
        return Map.of();
    }

    @Override
    public Map<String, Map<String, Object>> auditWordsBatch(List<Word> words) {
        if (words == null || words.isEmpty()) {
            return Map.of();
        }

        log.info("Gemini Sheriff auditing batch of {} words", words.size());

        StringBuilder batchDetails = new StringBuilder();
        for (int i = 0; i < words.size(); i++) {
            Word w = words.get(i);
            try {
                String defJson = objectMapper.writeValueAsString(w.getDefinition());
                batchDetails.append(String.format("%d. WORD: \"%s\", CONTEXT: \"%s\", DEFINITION: %s\n",
                        i + 1, w.getWord(),
                        w.getContextSentence() != null ? w.getContextSentence() : "No context",
                        defJson));
            } catch (Exception e) {
                log.error("Error serializing definition for auditing: {}", w.getWord());
            }
        }

        String systemPrompt = """
                You are a Master Lexicographer and the strict Quality Assurance (QA) Auditor for a professional English-Turkish dictionary database.
                Your sole purpose is to evaluate the provided "word", its "contextSentence", and its "current_definitions" against 4 strict criteria.

                ### THE 4 CRITICAL CRITERIA:
                1. PROPER NOUN TRAP (False Positives)
                2. VALIDITY & NOISE CHECK (Foreign, Typos, Subtitle Glitches)
                3. MEANING COMPLETENESS (Missing core meaning)
                4. HALLUCINATION & OVER-HELPFULNESS CHECK

                ### OUTPUT INSTRUCTIONS:
                You must output a JSON object where each key is the word, and each value is an object:
                {
                  "problem_found": boolean,
                  "step3_error": "Türkçe kısa ve net hata açıklaması (veya null)"
                }
                """;

        String userPrompt = "Audit the following words:\n\n" + batchDetails.toString();

        try {
            String response = generateContent(systemPrompt, userPrompt, SHERIFF_MODEL);
            if (response == null) {
                return Map.of();
            }

            String cleanResponse = response.replace("```json", "").replace("```", "").trim();
            return objectMapper.readValue(cleanResponse,
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Map<String, Object>>>() {
                    });
        } catch (Exception e) {
            log.error("Gemini batch audit failed", e);
            return Map.of();
        }
    }

    public com.sublex.model.WordDefinition fixWord(String word, String auditNotes, String contextSentence) {
        log.info("Gemini Specialist fixing word: '{}' because: {}. Context: {}", word, auditNotes, contextSentence);

        String systemPrompt = """
                You are a meticulous Senior Lexicographer and Turkish Language Expert for the Sublex dictionary.
                Your mission is to fix rejected dictionary entries with 100% linguistic accuracy.

                ### MANDATORY QUALITY CONTROLS:
                1. **TURKISH TRANSLATION IS STRICTLY REQUIRED**:
                   - Every 'definition' MUST be written in fluent Turkish.
                   - Every English 'example' MUST include its Turkish translation in parentheses.
                2. **ROOT MATCHING (CRITICAL)**:
                   - If the rejection reason is 'Root mismatch', you MUST change the "word" field in the JSON to the correct base root. Do not define the past tense or plural form!
                3. **CONTEXTUAL ALIGNMENT (CRITICAL)**:
                   - You MUST look at the provided 'CONTEXT'. The definition MUST match how the word is used in that sentence.
                4. **SEMANTIC UNIQUENESS (CRITICAL)**:
                   - Do NOT provide redundant or near-identical meanings. If a word primarily has one meaning, provide ONLY ONE.
                5. **NO NESTED LISTS (CRITICAL)**:
                   - Each 'definition' must be a SINGLE string. Do NOT use numbered lists (e.g., "1) ... 2) ...") inside a definition string. Use separate objects in the 'meanings' array instead.
                6. **STRICT VERB FORM KEYS (CRITICAL)**:
                   - You MUST use keys `v1`, `v2`, `v3`, and `ing` for the `verb_forms` object.
                   - Do NOT use `present`, `past`, `participle`. Use `v1`, `v2`, `v3`, `ing`.
                7. **PROPER NOUN LABELING**:
                   - Every word identified as a Name, Place, Brand, or Person MUST have `pos: "proper noun"`.
                8. **NO NULL LISTS (CRITICAL)**:
                   - If there are no `phrasal_verbs` or `meanings` to add, you MUST return an empty list `[]`.
                   - Do NOT use `null` for list fields.

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
                  "phrasal_verbs": [
                    {
                      "phrase": "exemplify by",
                      "definition": "Bir şey ile örneklendirmek.",
                      "example": "He exemplified the rule by giving an example. (Bir örnek vererek kuralı temellendirdi.)"
                    }
                  ],
                  "verb_forms": {
                    "v1": "exemplify",
                    "v2": "exemplified",
                    "v3": "exemplified",
                    "ing": "exemplifying"
                  }
                }
                Return ONLY a single valid JSON object. No conversational filler.
                """;

        String userPrompt = String.format(
                """
                        STRICT RECTIFICATION REQUIRED:

                        1. WORD: "%s"
                        2. REJECTION REASON: "%s"
                        3. CONTEXT: "%s"

                        ACTION PLAN:
                        - Ensure the definition matches the CONTEXT.
                        - Correct any errors identified in the REJECTION REASON.

                        Provide the corrected JSON now:
                        """,
                word, auditNotes, contextSentence != null ? contextSentence : "");

        String fullPrompt = systemPrompt + "\n\n" + userPrompt;

        // RETRY MECHANISM (2 Attempts)
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                String response = generateContent(systemPrompt, userPrompt, SPECIALIST_MODEL);
                if (response == null)
                    continue;

                log.info("Gemini Specialist response for {} (Attempt {}): {}", word, attempt, response);
                return objectMapper.readValue(response, com.sublex.model.WordDefinition.class);

            } catch (Exception e) {
                log.warn("Gemini Specialist failed to fix word: {} (Attempt {}). Error: {}", word, attempt,
                        e.getMessage());
            }
        }
        return null;
    }
}
