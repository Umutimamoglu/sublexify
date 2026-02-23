package com.sublex.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sublex.model.User;
import com.sublex.model.Word;
import com.sublex.model.WordDefinition;
import com.sublex.model.WordList;
import com.sublex.repository.UserRepository;
import com.sublex.repository.WordListRepository;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class StandardListSeeder {

    private final WordRepository wordRepository;
    private final WordListRepository wordListRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // Hardcoded system user ID (usually admin or ID 1)
    private static final Long SYSTEM_USER_ID = 1L;

    @Transactional
    public String seedList(String listName, String filename) {
        log.info("Seeding list '{}' from file: {}", listName, filename);

        try {
            // 1. Read words from resource file
            ClassPathResource resource = new ClassPathResource("data/" + filename);
            if (!resource.exists()) {
                throw new RuntimeException("File not found: " + filename);
            }

            Set<String> wordsToSeed = new HashSet<>();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String word = line.trim().toLowerCase();
                    if (!word.isEmpty()) {
                        wordsToSeed.add(word);
                    }
                }
            }

            if (wordsToSeed.isEmpty()) {
                return "List file is empty: " + filename;
            }

            log.info("Found {} unique words in file", wordsToSeed.size());

            // 2. Get or Create WordList
            User systemUser = userRepository.findById(SYSTEM_USER_ID)
                    .orElseThrow(() -> new RuntimeException("System user not found"));

            WordList wordList = wordListRepository.findByNameAndUserId(listName, SYSTEM_USER_ID)
                    .orElseGet(() -> {
                        WordList newList = new WordList();
                        newList.setName(listName);
                        newList.setUser(systemUser);
                        return wordListRepository.save(newList);
                    });

            // 3. Batch Process Words
            // Fetch existing words to avoid duplicates
            java.util.List<Word> existingWords = wordRepository.findByWordInAndLanguage(wordsToSeed, "en");
            Set<String> existingWordTexts = existingWords.stream()
                    .map(Word::getWord)
                    .collect(Collectors.toSet());

            // Create new words
            java.util.List<Word> newWords = new java.util.ArrayList<>();
            for (String wordText : wordsToSeed) {
                if (!existingWordTexts.contains(wordText)) {
                    newWords.add(Word.builder()
                            .word(wordText)
                            .language("en")
                            .build());
                }
            }

            if (!newWords.isEmpty()) {
                log.info("Saving {} new words to database...", newWords.size());
                existingWords.addAll(wordRepository.saveAll(newWords));
            }

            // 4. Update WordList Association
            // We use a Set to avoid duplicates if the list already has some words
            Set<Word> currentListWords = wordList.getWords();
            if (currentListWords == null) {
                currentListWords = new HashSet<>();
            }

            int addedCount = 0;
            for (Word word : existingWords) {
                if (currentListWords.add(word)) { // add returns true if set didn't already contain the element
                    addedCount++;
                }
            }
            wordList.setWords(currentListWords);
            wordListRepository.save(wordList);

            return String.format(
                    "Successfully seeded '%s'. Processed %d words. Added %d new words to DB. List now has %d words.",
                    listName, wordsToSeed.size(), newWords.size(), wordList.getWords().size());

        } catch (Exception e) {
            log.error("Failed to seed list: {}", listName, e);
            throw new RuntimeException("Seeding failed: " + e.getMessage());
        }
    }

    @Transactional
    public String seedOxfordList() {
        String filename = "oxford-5000.csv";
        log.info("Seeding Oxford 5000 list from file: {}", filename);

        try {
            ClassPathResource resource = new ClassPathResource("data/" + filename);
            if (!resource.exists()) {
                throw new RuntimeException("File not found: " + filename);
            }

            // Map to store word -> easiest difficulty (to handle duplicates like noun/verb)
            java.util.Map<String, String> wordDifficultyMap = new java.util.HashMap<>();
            java.util.List<String> difficultyOrder = java.util.List.of("a1", "a2", "b1", "b2", "c1", "current");

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {

                String header = reader.readLine(); // skip header: word,class,level
                String line;
                while ((line = reader.readLine()) != null) {
                    String[] parts = line.split(",");
                    if (parts.length < 3)
                        continue;

                    String word = parts[0].trim().toLowerCase();
                    String level = parts[2].trim().toLowerCase();

                    if (word.isEmpty() || level.isEmpty())
                        continue;

                    // If word already exists, keep the "easier" level
                    if (wordDifficultyMap.containsKey(word)) {
                        String existingLevel = wordDifficultyMap.get(word);
                        if (difficultyOrder.indexOf(level) < difficultyOrder.indexOf(existingLevel)) {
                            wordDifficultyMap.put(word, level);
                        }
                    } else {
                        wordDifficultyMap.put(word, level);
                    }
                }
            }

            if (wordDifficultyMap.isEmpty()) {
                return "Oxford file is empty or invalid: " + filename;
            }

            log.info("Found {} unique Oxford words", wordDifficultyMap.size());

            User systemUser = userRepository.findById(SYSTEM_USER_ID)
                    .orElseThrow(() -> new RuntimeException("System user not found"));

            WordList wordList = wordListRepository.findByNameAndUserId("Oxford 5000", SYSTEM_USER_ID)
                    .orElseGet(() -> {
                        WordList newList = new WordList();
                        newList.setName("Oxford 5000");
                        newList.setUser(systemUser);
                        return wordListRepository.save(newList);
                    });

            // Fetch existing to avoid DB constraint violation
            java.util.List<Word> existingInDb = wordRepository.findByWordInAndLanguage(wordDifficultyMap.keySet(),
                    "en");
            java.util.Set<String> existingWordTexts = existingInDb.stream()
                    .map(Word::getWord)
                    .collect(Collectors.toSet());

            java.util.List<Word> newWords = new java.util.ArrayList<>();
            for (java.util.Map.Entry<String, String> entry : wordDifficultyMap.entrySet()) {
                String wordText = entry.getKey();
                String difficulty = entry.getValue().toUpperCase();

                if (!existingWordTexts.contains(wordText)) {
                    newWords.add(Word.builder()
                            .word(wordText)
                            .language("en")
                            .difficulty(difficulty)
                            .isEnriched(false)
                            .status("PENDING")
                            .build());
                } else {
                    // Update existing words with Oxford difficulty if it was missing or different?
                    // For now, let's just focus on seeding.
                }
            }

            if (!newWords.isEmpty()) {
                log.info("Saving {} new Oxford words to DB...", newWords.size());
                existingInDb.addAll(wordRepository.saveAll(newWords));
            }

            // Relationship
            Set<Word> currentListWords = wordList.getWords();
            if (currentListWords == null)
                currentListWords = new HashSet<>();

            for (Word word : existingInDb) {
                currentListWords.add(word);
            }
            wordList.setWords(currentListWords);
            wordListRepository.save(wordList);

            return String.format("Successfully seeded Oxford 5000. Added %d new words. Total in list: %d",
                    newWords.size(), wordList.getWords().size());

        } catch (Exception e) {
            log.error("Failed to seed Oxford list", e);
            throw new RuntimeException("Oxford seeding failed: " + e.getMessage());
        }
    }

    @Transactional
    public String seedFrequencyListJson(String listName, String fileName, Integer limit) {
        log.info("Seeding frequency list '{}' from {}", listName, fileName);
        try {
            ClassPathResource resource = new ClassPathResource("data/" + fileName);
            List<Map<String, Object>> curatedList = objectMapper.readValue(
                    resource.getInputStream(),
                    new TypeReference<List<Map<String, Object>>>() {
                    });

            User systemUser = userRepository.findById(1L)
                    .orElseThrow(() -> new RuntimeException("System user not found"));

            WordList wordList = wordListRepository.findByName(listName)
                    .orElseGet(() -> {
                        WordList newList = new WordList();
                        newList.setName(listName);
                        newList.setUser(systemUser);
                        newList.setWords(new HashSet<>());
                        return wordListRepository.save(newList);
                    });

            Set<String> wordsToProcess = curatedList.stream()
                    .limit(limit != null ? limit : curatedList.size())
                    .map(m -> ((String) m.get("word")).toLowerCase())
                    .collect(Collectors.toSet());

            List<Word> existingWords = wordRepository.findByWordIn(wordsToProcess);
            Map<String, Word> existingWordMap = existingWords.stream()
                    .collect(Collectors.toMap(Word::getWord, w -> w));

            List<Word> wordsToSave = new ArrayList<>();
            Set<Word> listWords = wordList.getWords();

            for (String text : wordsToProcess) {
                Word word = existingWordMap.get(text);
                if (word == null) {
                    word = Word.builder()
                            .word(text)
                            .language("en")
                            .isEnriched(false)
                            .status("PENDING")
                            .build();
                }
                wordsToSave.add(word);
                listWords.add(word);
            }

            wordRepository.saveAll(wordsToSave);
            wordListRepository.save(wordList);

            return "Successfully seeded " + wordsToSave.size() + " words into list '" + listName + "'";
        } catch (Exception e) {
            log.error("Failed to seed frequency list {}", listName, e);
            throw new RuntimeException("Failed to seed frequency list: " + e.getMessage());
        }
    }

    @Transactional
    public String seedPhrasalVerbJson(String listName, String fileName) {
        log.info("Seeding phrasal verb list '{}' from {}", listName, fileName);
        try {
            ClassPathResource resource = new ClassPathResource("data/" + fileName);
            List<Map<String, String>> curatedList = objectMapper.readValue(
                    resource.getInputStream(),
                    new TypeReference<List<Map<String, String>>>() {
                    });

            User systemUser = userRepository.findById(1L)
                    .orElseThrow(() -> new RuntimeException("System user not found"));

            WordList wordList = wordListRepository.findByName(listName)
                    .orElseGet(() -> {
                        WordList newList = new WordList();
                        newList.setName(listName);
                        newList.setUser(systemUser);
                        newList.setWords(new HashSet<>());
                        return wordListRepository.save(newList);
                    });

            Set<String> wordTexts = curatedList.stream()
                    .map(m -> m.get("pv").toLowerCase())
                    .collect(Collectors.toSet());

            List<Word> existingWords = wordRepository.findByWordIn(wordTexts);
            Map<String, Word> existingWordMap = existingWords.stream()
                    .collect(Collectors.toMap(Word::getWord, w -> w));

            List<Word> wordsToSave = new ArrayList<>();
            Set<Word> listWords = wordList.getWords();
            Set<Long> existingWordIdsInList = listWords.stream()
                    .map(Word::getId)
                    .filter(java.util.Objects::nonNull)
                    .collect(Collectors.toSet());

            for (Map<String, String> m : curatedList) {
                String text = m.get("pv").toLowerCase();
                Word word = existingWordMap.get(text);

                if (word == null) {
                    WordDefinition definition = new WordDefinition();
                    definition.setWord(text);

                    WordDefinition.Meaning meaning = new WordDefinition.Meaning();
                    meaning.setPos("phrasal verb");
                    meaning.setDefinition(m.get("anlam_tr"));
                    meaning.setExample(m.get("ornek_en") + " (" + m.get("ornek_tr") + ")");

                    List<WordDefinition.Meaning> meanings = new ArrayList<>();
                    meanings.add(meaning);
                    definition.setMeanings(meanings);

                    word = Word.builder()
                            .word(text)
                            .language("en")
                            .isEnriched(true)
                            .status("PROCESSED")
                            .definition(definition)
                            .difficulty(m.get("difficulty"))
                            .enrichedAt(LocalDateTime.now())
                            .build();

                    // Add to map to avoid duplicates if the same PV appears again in the JSON
                    existingWordMap.put(text, word);
                    wordsToSave.add(word);
                } else {
                    // Update difficulty for existing words if present in JSON
                    if (m.containsKey("difficulty")) {
                        word.setDifficulty(m.get("difficulty"));
                        if (!wordsToSave.contains(word)) {
                            wordsToSave.add(word);
                        }
                    }
                }

                // Associate word with list only if not already tied
                // For new words (id == null), we add them. For existing words, we check if they
                // are already in the list.
                if (word.getId() == null || !existingWordIdsInList.contains(word.getId())) {
                    listWords.add(word);
                    // If it was an existing word not in list, update our tracking set so it doesn't
                    // try to add again if PV repeats in JSON
                    if (word.getId() != null) {
                        existingWordIdsInList.add(word.getId());
                    }
                }
            }

            wordRepository.saveAll(wordsToSave);
            // Relationship is handled by listWords being the same set as
            // wordList.getWords()
            // but we save wordList to persist the new associations
            wordListRepository.save(wordList);

            return "Successfully seeded " + curatedList.size() + " phrasal verbs into list '" + listName + "'";
        } catch (Exception e) {
            log.error("Failed to seed phrasal verb list {}", listName, e);
            throw new RuntimeException("Failed to seed phrasal verb list: " + e.getMessage());
        }
    }

    @Transactional
    public String seedVerbJsonList(String filename) {
        log.info("Seeding curated verb list from JSON file: {}", filename);
        try {
            ClassPathResource resource = new ClassPathResource("data/" + filename);
            if (!resource.exists()) {
                throw new RuntimeException("File not found: " + filename);
            }

            List<WordDefinition> curatedVerbs = objectMapper.readValue(
                    resource.getInputStream(),
                    new TypeReference<List<WordDefinition>>() {
                    });

            if (curatedVerbs.isEmpty()) {
                return "Verb JSON file is empty: " + filename;
            }

            User systemUser = userRepository.findById(SYSTEM_USER_ID)
                    .orElseThrow(() -> new RuntimeException("System user not found"));

            WordList wordList = wordListRepository.findByNameAndUserId("Top Verbs", SYSTEM_USER_ID)
                    .orElseGet(() -> {
                        WordList newList = new WordList();
                        newList.setName("Top Verbs");
                        newList.setUser(systemUser);
                        return wordListRepository.save(newList);
                    });

            Set<String> wordTexts = curatedVerbs.stream()
                    .map(WordDefinition::getWord)
                    .collect(Collectors.toSet());

            Map<String, Word> existingWordMap = wordRepository.findByWordInAndLanguage(wordTexts, "en")
                    .stream()
                    .collect(Collectors.toMap(Word::getWord, w -> w));

            List<Word> wordsToSave = new ArrayList<>();
            Set<Word> listWords = wordList.getWords() != null ? wordList.getWords() : new HashSet<>();

            for (WordDefinition curated : curatedVerbs) {
                String text = curated.getWord().toLowerCase();
                Word word = existingWordMap.get(text);

                if (word == null) {
                    word = Word.builder()
                            .word(text)
                            .language("en")
                            .difficulty(curated.getDifficulty())
                            .isEnriched(true)
                            .status("PROCESSED")
                            .definition(curated)
                            .build();
                } else {
                    // MERGE LOGIC
                    WordDefinition existingDef = word.getDefinition();
                    if (existingDef == null) {
                        word.setDefinition(curated);
                    } else {
                        // Keep non-verb meanings, replace/add verb meanings
                        List<WordDefinition.Meaning> mergedMeanings = new ArrayList<>();

                        // Add all non-verb meanings from existing
                        if (existingDef.getMeanings() != null) {
                            for (WordDefinition.Meaning m : existingDef.getMeanings()) {
                                if (!"verb".equalsIgnoreCase(m.getPos())) {
                                    mergedMeanings.add(m);
                                }
                            }
                        }

                        // Add verb meanings from curated
                        if (curated.getMeanings() != null) {
                            mergedMeanings.addAll(curated.getMeanings());
                        }

                        existingDef.setMeanings(mergedMeanings);
                        existingDef.setVerbForms(curated.getVerbForms());
                        existingDef.setPhrasalVerbs(curated.getPhrasalVerbs());
                        word.setDefinition(existingDef);
                    }
                    word.setDifficulty(curated.getDifficulty());
                    word.setIsEnriched(true);
                    word.setStatus("PROCESSED");
                    word.setEnrichedAt(java.time.LocalDateTime.now());
                }
                wordsToSave.add(word);
                listWords.add(word);
            }

            wordRepository.saveAll(wordsToSave);
            wordList.setWords(listWords);
            wordListRepository.save(wordList);

            return String.format("Successfully seeded curated verbs. Processed %d verbs.", curatedVerbs.size());

        } catch (Exception e) {
            log.error("Failed to seed verb JSON list", e);
            throw new RuntimeException("Verb seeding failed: " + e.getMessage());
        }
    }

    @Transactional
    public String seedDefaults() {
        StringBuilder result = new StringBuilder();

        result.append(seedVerbJsonList("top_verbs_by_frequency.json")).append("\n");
        result.append(seedFrequencyListJson("Top Adjectives", "top_adjectives_by_frequency.json", null)).append("\n");
        result.append(seedFrequencyListJson("Top Adverbs", "top_adverbs_by_frequency.json", null)).append("\n");
        result.append(seedPhrasalVerbJson("200 Common Phrasal Verbs", "phrasal_verbs.json")).append("\n");
        result.append(seedOxfordList()).append("\n");

        return result.toString();
    }

}
