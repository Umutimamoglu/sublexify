package com.sublex.service;

import com.sublex.dto.WordDTO;
import com.sublex.model.User;
import com.sublex.model.UserKnownWord;
import com.sublex.model.Word;
import com.sublex.repository.UserKnownWordRepository;
import com.sublex.repository.UserRepository;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserKnownWordService {

    private final UserRepository userRepository;
    private final WordRepository wordRepository;
    private final UserKnownWordRepository userKnownWordRepository;

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
                    dto.setFrequency(0); // Not relevant for known words list
                    dto.setIsKnown(true);
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Get learning statistics for a user
     */
    public Map<String, Integer> getUserStatistics(Long userId) {
        int totalKnownWords = userKnownWordRepository.countByUserId(userId);

        Map<String, Integer> stats = new HashMap<>();
        stats.put("totalKnownWords", totalKnownWords);
        stats.put("wordsLearnedToday", 0); // TODO: implement date-based filtering
        stats.put("wordsLearnedThisWeek", 0); // TODO: implement date-based filtering

        return stats;
    }
}
