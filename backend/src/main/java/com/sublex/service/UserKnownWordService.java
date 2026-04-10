package com.sublex.service;

import com.sublex.dto.WordDTO;
import com.sublex.model.User;
import com.sublex.model.UserKnownWord;
import com.sublex.model.Word;
import com.sublex.model.UserWordProgress;
import com.sublex.repository.UserKnownWordRepository;
import com.sublex.repository.UserRepository;
import com.sublex.repository.WordRepository;
import com.sublex.repository.WordListRepository;
import com.sublex.repository.UserWordProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserKnownWordService {

    private final UserRepository userRepository;
    private final WordRepository wordRepository;
    private final UserKnownWordRepository userKnownWordRepository;
    private final WordListRepository wordListRepository;
    private final UserWordProgressRepository userWordProgressRepository;

    /**
     * Mark a word as known by user
     */
    @Transactional
    public void markWordAsKnown(Long userId, Long wordId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Word word = wordRepository.findById(wordId)
                .orElseThrow(() -> new RuntimeException("Word not found: " + wordId));

        // Check if already marked
        if (userKnownWordRepository.existsByUserIdAndWordId(userId, wordId)) {
            return; // Already marked, nothing to do
        }

        UserKnownWord userKnownWord = new UserKnownWord();
        userKnownWord.setUser(user);
        userKnownWord.setWord(word);
        userKnownWord.setMarkedAt(LocalDateTime.now());

        userKnownWordRepository.save(userKnownWord);

        initProgressIfEligible(user, word);
    }

    /**
     * Mark multiple words as known for a specific media and levels
     */
    @Transactional
    public void markWordsAsKnownByMediaAndLevels(Long userId, Long mediaId, List<String> levels) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        List<Word> words = wordRepository.findByMediaIdAndDifficultyIn(mediaId, levels);
        List<Long> existingWordIds = userKnownWordRepository.findByUserId(userId)
                .stream()
                .map(ukw -> ukw.getWord().getId())
                .collect(Collectors.toList());

        List<UserKnownWord> newKnownWords = words.stream()
                .filter(w -> !existingWordIds.contains(w.getId()))
                .map(w -> {
                    UserKnownWord ukw = new UserKnownWord();
                    ukw.setUser(user);
                    ukw.setWord(w);
                    ukw.setMarkedAt(LocalDateTime.now());
                    return ukw;
                })
                .collect(Collectors.toList());

        if (!newKnownWords.isEmpty()) {
            userKnownWordRepository.saveAll(newKnownWords);
            for (UserKnownWord ukw : newKnownWords) {
                initProgressIfEligible(user, ukw.getWord());
            }
        }
    }

    private void initProgressIfEligible(User user, Word word) {
        boolean inCustomList = wordListRepository.existsByUserIdAndIsSystemFalseAndWordId(user.getId(), word.getId());
        if (inCustomList) {
            Optional<UserWordProgress> opt = userWordProgressRepository.findByUserIdAndWordId(user.getId(),
                    word.getId());
            if (opt.isEmpty()) {
                UserWordProgress p = new UserWordProgress();
                p.setUser(user);
                p.setWord(word);
                p.setReviewCount(0);
                p.setSuccessCount(0);
                p.setNextReviewDate(LocalDateTime.now().plusDays(1));
                userWordProgressRepository.save(p);
            }
        }
    }

    /**
     * Unmark a word (remove from known words)
     */
    @Transactional
    public void unmarkWordAsKnown(Long userId, Long wordId) {
        userKnownWordRepository.deleteByUserIdAndWordId(userId, wordId);
    }

    /**
     * Get all known words for a user
     */
    public List<WordDTO> getUserKnownWords(Long userId) {
        List<UserKnownWord> knownWords = userKnownWordRepository.findByUserId(userId);

        return knownWords.stream()
                .map(ukw -> {
                    WordDTO dto = new WordDTO();
                    dto.setId(ukw.getWord().getId());
                    dto.setWord(ukw.getWord().getWord());
                    dto.setLanguage(ukw.getWord().getLanguage());
                    dto.setFrequency(0);
                    dto.setIsKnown(true);
                    dto.setDifficulty(ukw.getWord().getDifficulty());
                    dto.setIsEnriched(ukw.getWord().getIsEnriched());
                    dto.setIsProperNoun(ukw.getWord().getIsProperNoun());
                    dto.setDefinition(ukw.getWord().getDefinition());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Get learning statistics for a user
     */
    public Map<String, Integer> getUserStatistics(Long userId) {
        int totalKnownWords = userKnownWordRepository.countByUserId(userId);

        LocalDateTime startOfDay = java.time.LocalDate.now().atStartOfDay();
        int wordsLearnedToday = userKnownWordRepository.countByUserIdAndMarkedAtAfter(userId, startOfDay);

        Map<String, Integer> stats = new HashMap<>();
        stats.put("totalKnownWords", totalKnownWords);
        stats.put("wordsLearnedToday", wordsLearnedToday); 
        stats.put("wordsLearnedThisWeek", 0); // TODO: implement date-based filtering
        stats.put("totalWords", (int) wordRepository.countEnriched());

        return stats;
    }
}
