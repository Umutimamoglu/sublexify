package com.sublex.service;

import com.sublex.model.User;
import com.sublex.model.Word;
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
import java.io.IOException;
import java.io.PrintWriter;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class StandardListSeeder {

    private final WordRepository wordRepository;
    private final WordListRepository wordListRepository;
    private final UserRepository userRepository;

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
    public String seedDefaults() {
        StringBuilder result = new StringBuilder();

        result.append(seedList("Top 500 Verbs", "top_500_verbs.txt")).append("\n");
        result.append(seedList("Top 200 Adjectives", "top_200_adjectives.txt")).append("\n");
        result.append(seedList("Top 100 Adverbs", "top_100_adverbs.txt")).append("\n");
        result.append(seedOxfordList()).append("\n"); // Use the new CSV method

        return result.toString();
    }

    @Transactional(readOnly = true)
    public String filterCocaList() {
        String cocaFilename = "COCA_20000.txt";
        log.info("Filtering COCA list against existing database words...");

        try {
            ClassPathResource resource = new ClassPathResource("data/" + cocaFilename);
            if (!resource.exists()) {
                throw new RuntimeException("COCA file not found: " + cocaFilename);
            }

            // 1. Get all words currently in DB (Oxford + others)
            java.util.List<Word> dbWords = wordRepository.findAll();
            java.util.Set<String> dbWordTexts = dbWords.stream()
                    .map(w -> w.getWord().toLowerCase())
                    .collect(Collectors.toSet());

            log.info("Found {} words in database to filter against.", dbWordTexts.size());

            // 2. Read COCA and filter
            java.util.List<String> cocaWords = new java.util.ArrayList<>();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String word = line.trim().toLowerCase();
                    if (!word.isEmpty() && !dbWordTexts.contains(word)) {
                        cocaWords.add(word);
                    }
                }
            }

            int originalCount = 20200; // Known from wc -l
            int filteredCount = cocaWords.size();
            int removedCount = originalCount - filteredCount;

            log.info("COCA Filtering complete. Original: {}, Removed: {}, Remaining: {}",
                    originalCount, removedCount, filteredCount);

            // 3. Write to a new file for record/review
            String outputFilename = "COCA_CLEANED.txt";
            java.io.File outputFile = new java.io.File(
                    "/Users/umutimamoglu/sublex/backend/src/main/resources/data/" + outputFilename);
            try (java.io.PrintWriter writer = new java.io.PrintWriter(outputFile)) {
                for (String word : cocaWords) {
                    writer.println(word);
                }
            }

            return String.format("COCA filtering done. Removed %d Oxford words. %d new COCA words saved to %s",
                    removedCount, filteredCount, outputFilename);

        } catch (Exception e) {
            log.error("COCA filtering failed", e);
            throw new RuntimeException("COCA filtering failed: " + e.getMessage());
        }
    }
}
