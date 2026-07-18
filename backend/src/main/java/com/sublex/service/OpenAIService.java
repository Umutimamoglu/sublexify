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

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;

@Service
@Primary
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
                                                setReadTimeout(180000); // 3 min - batch enrichment (25 words) needs more time
                                        }
                                })
                                .build();
        }

        private static final String OPENAI_URL = "https://api.openai.com/v1/chat/completions";
        private static final String MODEL = "gpt-5.6-luna";

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
                           - 'definition': DICTIONARY TRANSLATION IN TURKISH — NOT an encyclopedic explanation.
                             CRITICAL: Use the shortest, most direct Turkish equivalent first. If the word has a simple, well-known Turkish translation, USE IT.
                             - WRONG: "Motorlu, dört tekerlekli, insanları bir yerden başka bir yere taşımak için kullanılan kara taşıtı." → RIGHT: "Araba, otomobil."
                             - WRONG: "Üzerine yemek, eşya ve benzeri nesnelerin koyulduğu, genellikle dört ayaklı, düz yüzeyli mobilya." → RIGHT: "Masa."
                             - WRONG: "Sayfalardan oluşan, bilgi veya hikaye içeren basılı ya da dijital eser." → RIGHT: "Kitap."
                             - WRONG: "İnsanların oturduğu, arka dayanaklı mobilya parçası." → RIGHT: "Sandalye."
                             - For RARE or COMPLEX words (C1/C2), a brief explanatory definition is acceptable (e.g., 'magnanimity' → "Büyük ruhlu olma, cömertlik ve bağışlayıcılık.")
                             - RULE OF THUMB: If a Turkish person would answer with ONE WORD when asked "X ne demek?", use that one word.
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

        public String generateContent(String systemPrompt, String userPrompt, String modelName) {
                log.info("Calling OpenAI API with model: {}", modelName);
                try {
                        Map<String, Object> requestBody = Map.of(
                                        "model", modelName,
                                        "messages", List.of(
                                                        Map.of("role", "system", "content", systemPrompt),
                                                        Map.of("role", "user", "content", userPrompt)));

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
                        return (String) message.get("content");

                } catch (Exception e) {
                        log.error("Failed to generate content with OpenAI", e);
                        return null;
                }
        }

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
                                           - DİKKAT: Ana akım konuşma dilinde çok nadir kullanılan, edebi, karmaşık, akademik veya oldukça spesifik bir nüansı olan kelimeleri C1'e indirme, onları cesurca 'C2' olarak işaretle (Örn: ubiquitous, ephemeral, fastidious, syophonat, idiosyncratic vb.).
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

                        // GPT-5 Mini (veya varsayılan modelimiz) kullanarak yanıt üret
                        String response = generateContent(systemPrompt, userPrompt, MODEL);
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

        @Override
        public Map<String, Map<String, Object>> auditWordsBatch(List<Word> words) {
                Map<String, Map<String, Object>> results = new ConcurrentHashMap<>();

                String systemPrompt = """
                                You are a Master Lexicographer and the strict Quality Assurance (QA) Auditor for a professional English-Turkish dictionary database. Your sole purpose is to evaluate the provided "word", its "contextSentence", and its "current_definitions" against 4 strict criteria. 
                                
                                You must act as a ruthless gatekeeper. If the entry has ANY of the following 4 flaws, you must flag it.
                                
                                ### THE 4 CRITICAL CRITERIA:
                                
                                1. PROPER NOUN TRAP (False Positives):
                                - Is this word STRICTLY a specific person, place, or brand with absolutely NO common dictionary meaning? 
                                - FAIL EXAMPLE: "Vivaldi", "Keldysh", "Stallone" -> FAIL (These are strictly proper nouns).
                                - PASS EXAMPLE: "Tangerine", "Apple", "Left", "Hope" -> PASS (Even if capitalized or used as a name in the context, these are real, common dictionary words. Do NOT flag them).
                                
                                2. VALIDITY & NOISE CHECK (Foreign, Typos, Subtitle Glitches):
                                - Is this a 100% valid, real English word or recognized slang?
                                - FAIL EXAMPLE 1: Spanish/Foreign words ("nunca", "pasar", "mierda", "conmigo").
                                - FAIL EXAMPLE 2: Subtitle sync noise or fragments ("frm", "sync", "wh-wh", "s-themed").
                                - FAIL EXAMPLE 3: Obvious typos or misspellings ("libary", "thanaving").
                                
                                3. MEANING COMPLETENESS (The Root Overwrite Bug):
                                - Do the current definitions MISS the absolute most common, fundamental meaning of the word?
                                - FAIL EXAMPLE: If the word is "left" and the definition only says "past tense of leave" but completely misses the direction "sol", you must FAIL it. The core dictionary meaning must be present.
                                
                                4. HALLUCINATION & OVER-HELPFULNESS CHECK:
                                - Did the previous AI invent a fake meaning for a typo, or provide a serious academic definition for a pop-culture joke/pun?
                                - FAIL EXAMPLE: Inventing a slang definition for a typo like "weelong" (all week long).
                                - FAIL EXAMPLE: Treating a joke like "brisketcase" (brisket + basketcase) as a legitimate historical/slang term instead of recognizing it as a situational pun.
                                
                                ### OUTPUT INSTRUCTIONS:
                                You must output a JSON object where each key is the word, and each value is an object:
                                {
                                  "problem_found": boolean,
                                  "step3_error": "Türkçe kısa ve net hata açıklaması (veya null)"
                                }
                                """;

                StringBuilder userPromptBuilder = new StringBuilder("Audit the following words:\n\n");
                for (Word w : words) {
                        try {
                                String defJson = objectMapper.writeValueAsString(w.getDefinition());
                                userPromptBuilder.append(String.format("- Word: '%s'\n  Context: '%s'\n  Current Definition: %s\n\n",
                                                w.getWord(),
                                                w.getContextSentence() != null ? w.getContextSentence() : "No context",
                                                defJson));
                        } catch (Exception e) {
                                log.error("Error serializing definition for auditing: {}", w.getWord());
                        }
                }

                try {
                        Map<String, Object> requestBody = Map.of(
                                        "model", MODEL,
                                        "messages", List.of(
                                                        Map.of("role", "system", "content", systemPrompt),
                                                        Map.of("role", "user", "content", userPromptBuilder.toString())),
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

                        Map<String, Map<String, Object>> auditResults = objectMapper.readValue(content, Map.class);
                        return auditResults;

                } catch (Exception e) {
                        log.error("Batch audit failed", e);
                        return Collections.emptyMap();
                }
        }

        /**
         * AUDITOR v2 — Routes each enriched word into exactly one bucket:
         * DELETE (nonsense/invalid), RE_ENRICH (wrong/incomplete translation),
         * SHORTEN (correct but too verbose), or CLEAN. Uses the same gpt-5.4-mini model.
         * Returns a map keyed by word -> { "action": "...", "reason": "..." }.
         */
        public Map<String, Map<String, Object>> auditAndRouteWordsBatch(List<Word> words) {
                if (words == null || words.isEmpty()) {
                        return Collections.emptyMap();
                }

                String systemPrompt = """
                                You are a Master Lexicographer and the strict Quality-Assurance ROUTER for a professional English→Turkish dictionary database. For EACH provided entry ("word", "contextSentence", "current_definitions") you must choose EXACTLY ONE routing action.

                                ### THE 5 ACTIONS — evaluate in this PRIORITY order and pick the FIRST that applies:

                                1. PROPER_NOUN — The token is STRICTLY a specific person, place, or brand name with NO common, ordinary dictionary meaning at all (e.g. "Vivaldi", "Keldysh", "Stallone", "Albany" the city, "Denise" the given name). It just needs to be classified as a proper noun — do NOT invent or keep a "definition" for it.
                                   PASS EXAMPLE (do NOT choose this): "Tangerine", "Apple", "Left", "Hope", "Guard" — even if capitalized or used as a name in the context, these are real, common dictionary words with an ordinary meaning. Never route these here.
                                   Also NEVER route here an apostrophe-enclitic / possessive token (e.g. "caesar's", "campaign's", "label's") even if its base is a name — an enclitic is always DELETE (see rule 2), not PROPER_NOUN.

                                2. DELETE — The token is NOT a legitimate, reusable dictionary entry:
                                   - Gibberish, subtitle/OCR artifacts or fragments ("frm", "wh-wh", "s-themed", "sync").
                                   - Obvious typos/misspellings ("libary", "thanaving").
                                   - A foreign (non-English) word ("nunca", "mierda", "conmigo").
                                   - A SITUATIONAL PUN/WORDPLAY coined for one specific scene — e.g. blending a character's NAME with another word ("jo-incidence" = "Jo" + "coincidence"; "brisketcase" = "brisket" + "basketcase"). These look grammatically plausible and may even get a serious-sounding definition, but they are one-off jokes, not real words anyone would look up. Do NOT invent a dictionary meaning for them.
                                   - AN APOSTROPHE ENCLITIC — a token where an apostrophe attaches a clitic to a base word: "'s" (= is / has / possessive: "campaign's", "label's", "hood's", "second's", "fish's", "half-brother's"), "'ll" (= will: "nest'll"), plus "'ve", "'d", "'re", "'m". These are grammatical fragments, NEVER standalone dictionary entries, so they are ALWAYS DELETE — even when the base word ("campaign", "hood", "label", "missing") is a perfectly real, common word whose current definition looks correct, and even when part of the token happens to match a name or place. Do NOT route an enclitic to CLEAN, RE_ENRICH or PROPER_NOUN — the correct action is always DELETE.
                                     EXCEPTION: a genuinely lexicalized apostrophe word that is itself a real dictionary headword is NOT an enclitic and must be judged normally — e.g. "o'clock", "ma'am", "y'all", "jack-o'-lantern", "ne'er-do-well", "rock 'n' roll".
                                   ⚠️ Be CONSERVATIVE — DELETE is destructive. Choose it ONLY when the token is clearly not a real, usable English word or slang. Real words that happen to be used as names in the context (e.g. "Apple", "Hope", "Left", "Tangerine") are NEVER DELETE.
                                   ⚠️ CRITICAL — judge the WORD ITSELF, not just this one contextSentence. Even if the contextSentence uses the word as a joke, a misheard/mistranscribed filler, or a one-off play on a name (e.g. "urn" as a subtitle mishearing of "um"; "hooded" in a "Robin Hooded" pun), if the word independently exists as a real, common English dictionary word with its own ordinary meaning (check "current_definitions" — if they already describe a real, unrelated, correct meaning, that is strong evidence it's a real word), it is NEVER DELETE — only the coined/blended token itself (like "jo-incidence") is DELETE, not an existing real word that merely got used oddly in this one scene.

                                3. RE_ENRICH — It IS a real English word, but the current Turkish definition is WRONG, misleading, hallucinated, or MISSES the core / most-common meaning (e.g. "left" defined only as "past tense of leave" but missing the direction "sol"). The entry must be regenerated from scratch.

                                4. SHORTEN — The definition is CORRECT, but at least one meaning's Turkish "definition" string is a genuinely long, multi-clause, ENCYCLOPEDIC explanation (a full descriptive sentence, often with commas/subordinate clauses) INSTEAD OF a concise dictionary gloss.
                                   ⚠️ STRICT FLOOR — if EVERY meaning's Turkish definition is ALREADY a single word or a short phrase (roughly 1-4 words, e.g. "Güçlü.", "kuzey", "eğlence", "Yayınlamak.", "Diyalog, konuşma.", "Güvenlik görevlisi"), there is NOTHING to shorten — you MUST NOT choose SHORTEN, choose CLEAN instead. Do not flag something just because it *could* theoretically be one word shorter.
                                   PASS EXAMPLE (genuinely verbose → SHORTEN): "Bir kişinin ya da kurumun resmi olarak bir göreve veya makama atanmasını sağlayan, genellikle törenle gerçekleştirilen resmi işlem." (a full descriptive sentence).
                                   FAIL EXAMPLE (already concise → must be CLEAN, NOT SHORTEN): "Güçlü.", "kuzey", "tatil beldesi", "Yayınlamak.".

                                5. CLEAN — The entry is accurate, complete AND already concise. This is the DEFAULT when you are unsure whether something counts as SHORTEN — only choose SHORTEN when the verbosity is obvious and undeniable.

                                ### OUTPUT (STRICT):
                                Return a JSON object where each key is the word and each value is an object:
                                { "action": "PROPER_NOUN" | "DELETE" | "RE_ENRICH" | "SHORTEN" | "CLEAN", "reason": "Türkçe kısa ve net gerekçe" }
                                Return ONLY the JSON object, nothing else.
                                """;

                StringBuilder userPromptBuilder = new StringBuilder("Route the following words:\n\n");
                for (Word w : words) {
                        try {
                                String defJson = objectMapper.writeValueAsString(w.getDefinition());
                                userPromptBuilder.append(String.format("- Word: '%s'\n  Context: '%s'\n  Current Definition: %s\n\n",
                                                w.getWord(),
                                                w.getContextSentence() != null ? w.getContextSentence() : "No context",
                                                defJson));
                        } catch (Exception e) {
                                log.error("Error serializing definition for routing: {}", w.getWord());
                        }
                }

                try {
                        Map<String, Object> requestBody = Map.of(
                                        "model", MODEL,
                                        "messages", List.of(
                                                        Map.of("role", "system", "content", systemPrompt),
                                                        Map.of("role", "user", "content", userPromptBuilder.toString())),
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

                        Map<String, Map<String, Object>> routeResults = objectMapper.readValue(content, Map.class);
                        return routeResults;

                } catch (Exception e) {
                        log.error("Batch audit-route failed", e);
                        return Collections.emptyMap();
                }
        }

        /**
         * AUDITOR v2 — second-opinion check for a SHORTEN verdict, using a distinct
         * ("gpt-5.4", non-mini) model as an independent reviewer. Narrow binary
         * question only: is this definition genuinely verbose, or already concise?
         * This is NOT a code-side word-count rule — the verdict stays 100% AI-judged,
         * just by a second independent model call instead of a single pass.
         * Returns a map keyed by word -> true (genuinely too long, keep SHORTEN) or
         * false (already concise, should be routed back to CLEAN).
         */
        public Map<String, Boolean> verifyShortenBatch(List<Word> words) {
                if (words == null || words.isEmpty()) {
                        return Collections.emptyMap();
                }

                String systemPrompt = """
                                You are an independent second reviewer for a Turkish dictionary. For EACH word below, you are told another AI already flagged its Turkish definition(s) as "too verbose, should be shortened". Your ONLY job is to confirm or reject that specific claim.

                                Answer TRUE only if at least one meaning's Turkish "definition" is a genuinely long, multi-clause, encyclopedic explanation (a full descriptive sentence).
                                Answer FALSE if every meaning is already a short dictionary-style gloss (a single word or a short phrase, roughly 1-4 words) — there is nothing meaningful to shorten.

                                Return ONLY a JSON object: { "word1": true, "word2": false, ... }
                                """;

                StringBuilder userPromptBuilder = new StringBuilder(
                                "Review these SHORTEN verdicts:\n\n");
                for (Word w : words) {
                        try {
                                String defJson = objectMapper.writeValueAsString(w.getDefinition());
                                userPromptBuilder.append(String.format("- Word: '%s'\n  Current Definition: %s\n\n",
                                                w.getWord(), defJson));
                        } catch (Exception e) {
                                log.error("Error serializing definition for shorten-verification: {}", w.getWord());
                        }
                }

                String response = generateContent(systemPrompt, userPromptBuilder.toString(), "gpt-5.4");
                if (response == null) {
                        return Collections.emptyMap();
                }

                try {
                        String clean = response.replace("```json", "").replace("```", "").trim();
                        return objectMapper.readValue(clean, Map.class);
                } catch (Exception e) {
                        log.error("Failed to parse shorten-verification response", e);
                        return Collections.emptyMap();
                }
        }

        @Override
        public Map<String, WordDefinition> enrichWordsBatch(List<Word> words) {
                if (words == null || words.isEmpty()) {
                        return Collections.emptyMap();
                }

                Map<String, WordDefinition> results = new ConcurrentHashMap<>();
                log.info("Enriching batch of {} words via OpenAI (parallel individual calls)", words.size());

                try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
                        for (Word word : words) {
                                executor.submit(() -> {
                                        WordDefinition def = enrichWord(word.getWord(), word.getDifficulty(), word.getContextSentence());
                                        if (def != null) {
                                                results.put(word.getWord(), def);
                                        }
                                });
                        }
                }

                return results;
        }

        /**
         * Fixes a batch of rejected words using OpenAI gpt-5.4-mini.
         * Mirrors the logic of GeminiService.fixWordsBatch.
         */
        public Map<String, WordDefinition> fixWordsBatch(List<Word> words) {
                if (words == null || words.isEmpty()) {
                        return Collections.emptyMap();
                }

                log.info("OpenAI Specialist fixing batch of {} words", words.size());

                StringBuilder batchInput = new StringBuilder();
                for (int i = 0; i < words.size(); i++) {
                        Word w = words.get(i);
                        // Include step3Error (Sheriff's specific finding) so AI knows exactly what to fix
                        String previousError = (w.getStep3Error() != null && !w.getStep3Error().isBlank())
                                        ? w.getStep3Error()
                                        : (w.getAuditNotes() != null ? w.getAuditNotes() : "Unspecified error.");
                        batchInput.append(String.format(
                                        "%d. WORD: \"%s\"\n" +
                                        "   PREVIOUS AUDITOR ERROR: \"%s\"\n" +
                                        "   CONTEXT SENTENCE: \"%s\"\n" +
                                        "   ⚠️ DO NOT repeat the above error. Fix it specifically.\n\n",
                                        i + 1, w.getWord(), previousError,
                                        w.getContextSentence() != null ? w.getContextSentence() : ""));
                }

                String systemPrompt = """
                                You are a meticulous Senior Lexicographer and Turkish Language Expert.
                                Your mission is to fix rejected dictionary entries with 100% linguistic accuracy.

                                ### MANDATORY QUALITY CONTROLS:
                                1. **TURKISH TRANSLATION IS STRICTLY REQUIRED**:
                                   - Every 'definition' MUST be written in fluent Turkish.
                                   - Every English 'example' MUST include its Turkish translation in parentheses.
                                   - **CONCISE DEFINITIONS (CRITICAL)**: Use the shortest, most direct Turkish equivalent.
                                     - WRONG: "Motorlu, dört tekerlekli, insanları taşımak için kullanılan kara taşıtı." → RIGHT: "Araba, otomobil."
                                     - RULE: If a Turkish person would answer with ONE WORD, use that one word.
                                2. **ROOT MATCHING (CRITICAL)**:
                                   - If the rejection reason is 'Root mismatch', you MUST change the "word" field to the correct base root.
                                3. **SEMANTIC UNIQUENESS (CRITICAL)**:
                                   - Do NOT provide redundant or near-identical meanings.
                                4. **NO NESTED LISTS (CRITICAL)**:
                                   - Each 'definition' must be a SINGLE string. Do NOT use numbered lists inside a definition string.
                                5. **STRICT VERB FORM KEYS (CRITICAL)**:
                                   - Use keys `v1`, `v2`, `v3`, and `ing` for the `verb_forms` object.
                                6. **PROPER NOUN LABELING**:
                                   - Every word identified as a Name, Place, Brand, or Person MUST have `pos: "proper noun"`.
                                7. **NO NULL LISTS (CRITICAL)**:
                                   - If there are no `phrasal_verbs` or `meanings`, return an empty list `[]`.

                                ### CONTEXTUAL ALIGNMENT (CRITICAL):
                                For each word, look at the 'CONTEXT' provided. The definition MUST match how the word is used in that sentence.

                                ### JSON STRUCTURE:
                                Return a JSON array of objects:
                                [
                                  {
                                    "word": "correct_root",
                                    "difficulty": "B2",
                                    "meanings": [{ "pos": "verb", "definition": "Türkçe tanım.", "example": "English example. (Türkçe çeviri.)" }],
                                    "phrasal_verbs": [],
                                    "verb_forms": { "v1": "...", "v2": "...", "v3": "...", "ing": "..." }
                                  }
                                ]
                                Return ONLY JSON. No conversational filler.
                                """;

                String userPrompt = String.format("""
                                STRICT RECTIFICATION REQUIRED FOR THE FOLLOWING WORDS:

                                %s

                                Provide the corrected JSON array now:
                                """, batchInput.toString());

                for (int attempt = 1; attempt <= 2; attempt++) {
                        try {
                                Map<String, Object> requestBody = Map.of(
                                                "model", MODEL,
                                                "messages", List.of(
                                                                Map.of("role", "system", "content", systemPrompt),
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
                                String cleanContent = content.replace("```json", "").replace("```", "").trim();

                                // OpenAI json_object mode returns a wrapper object, handle both array and object
                                Object parsed = objectMapper.readValue(cleanContent, Object.class);
                                List<WordDefinition> definitions;
                                if (parsed instanceof List) {
                                        definitions = objectMapper.readValue(cleanContent,
                                                        new com.fasterxml.jackson.core.type.TypeReference<List<WordDefinition>>() {});
                                } else if (parsed instanceof Map) {
                                        // Might be wrapped like { "words": [...] }
                                        Map<String, Object> wrapper = (Map<String, Object>) parsed;
                                        Object inner = wrapper.values().iterator().next();
                                        String innerJson = objectMapper.writeValueAsString(inner);
                                        definitions = objectMapper.readValue(innerJson,
                                                        new com.fasterxml.jackson.core.type.TypeReference<List<WordDefinition>>() {});
                                } else {
                                        definitions = List.of();
                                }

                                log.info("OpenAI Specialist parsed {} definitions", definitions.size());

                                Map<String, WordDefinition> result = new java.util.TreeMap<>(String.CASE_INSENSITIVE_ORDER);
                                for (WordDefinition def : definitions) {
                                        if (def.getWord() != null) {
                                                result.put(def.getWord(), def);
                                        }
                                }
                                return result;

                        } catch (Exception e) {
                                log.warn("OpenAI Specialist failed batch fix (Attempt {}). Error: {}", attempt, e.getMessage());
                        }
                }
                return Collections.emptyMap();
        }
}
