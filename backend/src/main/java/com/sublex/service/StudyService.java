package com.sublex.service;

import com.sublex.dto.StudyQuestionDTO;
import com.sublex.dto.StudyResultDTO;
import com.sublex.model.UserWordProgress;
import com.sublex.model.WordList;
import com.sublex.model.Word;
import com.sublex.model.User;
import com.sublex.repository.UserWordProgressRepository;
import com.sublex.repository.WordListRepository;
import com.sublex.repository.UserRepository;
import com.sublex.repository.WordRepository;
import com.sublex.repository.UserKnownWordRepository;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import com.sublex.model.WordDefinition;

@Service
@RequiredArgsConstructor
public class StudyService {

    private final UserWordProgressRepository userWordProgressRepository;
    private final WordListRepository wordListRepository;
    private final WordRepository wordRepository;
    private final UserRepository userRepository;
    private final UserKnownWordRepository userKnownWordRepository;

    public List<StudyQuestionDTO> getNextBatch(Long userId, Long listId, int size, List<String> types) {
        WordList list = wordListRepository.findById(listId)
                .orElseThrow(() -> new RuntimeException("List not found"));

        if (!list.getUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        List<Word> allWords = new ArrayList<>(list.getWords());

        List<Long> wordIds = allWords.stream().map(Word::getId).collect(Collectors.toList());
        List<UserWordProgress> progresses = userWordProgressRepository.findByUserIdAndWordIdIn(userId, wordIds);

        allWords.sort((w1, w2) -> {
            UserWordProgress p1 = getProgress(progresses, w1.getId());
            UserWordProgress p2 = getProgress(progresses, w2.getId());

            double score1 = p1 == null ? 0.0 : getScore(p1);
            double score2 = p2 == null ? 0.0 : getScore(p2);

            LocalDateTime now = LocalDateTime.now();
            boolean due1 = p1 != null && p1.getNextReviewDate() != null && p1.getNextReviewDate().isBefore(now);
            boolean due2 = p2 != null && p2.getNextReviewDate() != null && p2.getNextReviewDate().isBefore(now);

            if (due1 && !due2)
                return -1;
            if (!due1 && due2)
                return 1;

            return Double.compare(score1, score2);
        });

        List<Word> batch = allWords.stream().limit(size).collect(Collectors.toList());

        List<StudyQuestionDTO> questions = new ArrayList<>();
        java.util.Random rnd = new java.util.Random();
        for (Word word : batch) {
            String questionType = determineQuestionType(getProgress(progresses, word.getId()), types, rnd);

            String definitionText = "No definition available";
            String exampleSentence = null;
            if (word.getDefinition() != null && word.getDefinition().getMeanings() != null
                    && !word.getDefinition().getMeanings().isEmpty()) {
                WordDefinition.Meaning firstMeaning = word.getDefinition().getMeanings().get(0);
                definitionText = firstMeaning.getDefinition();
                exampleSentence = firstMeaning.getExample();
            }

            StudyQuestionDTO dto = StudyQuestionDTO.builder()
                    .wordId(word.getId())
                    .word(word.getWord())
                    .definition(definitionText)
                    .contextSentence(exampleSentence)
                    .questionType(questionType)
                    .difficulty(word.getDifficulty())
                    .correctAnswer(word.getWord())
                    .build();

            if ("MULTIPLE_CHOICE".equals(questionType) || "LISTENING".equals(questionType)) {
                List<String> options = new ArrayList<>();
                options.add(word.getWord());
                List<Word> distractors = new ArrayList<>(allWords);
                Collections.shuffle(distractors);
                for (Word w : distractors) {
                    if (!w.getWord().equals(word.getWord()) && options.size() < 4) {
                        options.add(w.getWord());
                    }
                }
                while (options.size() < 4) {
                    options.add("dummy_" + options.size());
                }
                Collections.shuffle(options);
                dto.setChoices(options);
            }
            questions.add(dto);
        }

        return questions;
    }

    private UserWordProgress getProgress(List<UserWordProgress> progresses, Long wordId) {
        return progresses.stream().filter(p -> p.getWord().getId().equals(wordId)).findFirst().orElse(null);
    }

    private double getScore(UserWordProgress p) {
        return (double) (p.getSuccessCount() + 1) / (p.getReviewCount() + 2);
    }

    private String determineQuestionType(UserWordProgress p, List<String> types, java.util.Random rnd) {
        if (types != null && !types.isEmpty()) {
            List<String> parsedTypes = new ArrayList<>();
            for (String t : types) {
                if (t == null || t.trim().isEmpty())
                    continue;
                if (t.contains(",")) {
                    for (String splitT : t.split(",")) {
                        String s = splitT.trim();
                        if (!s.isEmpty())
                            parsedTypes.add(s);
                    }
                } else {
                    parsedTypes.add(t.trim());
                }
            }
            if (!parsedTypes.isEmpty()) {
                String chosen = parsedTypes.get(rnd.nextInt(parsedTypes.size()));
                // System.out.println("Parsed types: " + parsedTypes + " -> Chosen: " + chosen);
                return chosen;
            }
        }

        // Default SRS logic if no types are provided or if provided list was empty
        if (p == null || p.getSuccessCount() < 2) {
            return "MULTIPLE_CHOICE";
        } else if (p.getSuccessCount() < 5) {
            return "FILL_IN_THE_BLANKS";
        } else {
            return "LISTENING";
        }
    }

    public void processStudyResults(Long userId, List<StudyResultDTO> results) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        for (StudyResultDTO result : results) {
            Word word = wordRepository.findById(result.getWordId())
                    .orElseThrow(() -> new RuntimeException("Word not found"));

            boolean isKnown = userKnownWordRepository.existsByUserIdAndWordId(userId, word.getId());
            boolean inCustomList = wordListRepository.existsByUserIdAndIsSystemFalseAndWordId(userId, word.getId());

            if (isKnown && inCustomList) {
                Optional<UserWordProgress> progressOpt = userWordProgressRepository.findByUserIdAndWordId(userId,
                        word.getId());

                if (progressOpt.isPresent()) {
                    UserWordProgress progress = progressOpt.get();
                    progress.setReviewCount(progress.getReviewCount() + 1);
                    if (result.getIsCorrect()) {
                        progress.setSuccessCount(progress.getSuccessCount() + 1);
                    }

                    int intervalDays = 1;
                    if (result.getIsCorrect()) {
                        intervalDays = progress.getSuccessCount() * 2;
                    } else {
                        intervalDays = 0; // Review tomorrow if wrong
                    }
                    progress.setNextReviewDate(LocalDateTime.now().plusDays(intervalDays));

                    userWordProgressRepository.save(progress);
                }
            }
        }
    }
}
