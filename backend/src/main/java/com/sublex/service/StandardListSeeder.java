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
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
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
                    newWords.add(new Word(null, wordText, "en", null));
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
    public String seedDefaults() {
        StringBuilder result = new StringBuilder();

        result.append(seedList("Top 500 Verbs", "top_500_verbs.txt")).append("\n");
        result.append(seedList("Top 200 Adjectives", "top_200_adjectives.txt")).append("\n");
        result.append(seedList("Top 100 Adverbs", "top_100_adverbs.txt")).append("\n");
        result.append(seedList("Oxford 3000", "oxford_3000.txt")).append("\n");

        return result.toString();
    }
}
