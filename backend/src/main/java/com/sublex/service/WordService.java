package com.sublex.service;

import com.sublex.dto.WordDTO;
import com.sublex.model.Word;
import com.sublex.repository.MediaWordRepository;
import com.sublex.repository.UserKnownWordRepository;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WordService {

    private final WordRepository wordRepository;
    private final MediaWordRepository mediaWordRepository;
    private final UserKnownWordRepository userKnownWordRepository;

    /**
     * Search words by query string
     */
    public List<WordDTO> searchWords(String query, String language, List<String> difficulties, boolean onlyUnknown, Long userId) {
        List<Word> words = wordRepository.findByWordContainingAndLanguage(query.toLowerCase(), language);

        // Get known word IDs if user provided
        Set<Long> knownWordIds = Set.of();
        if (userId != null) {
            knownWordIds = userKnownWordRepository.findByUserId(userId).stream()
                    .map(ukw -> ukw.getWord().getId())
                    .collect(Collectors.toSet());
        }

        boolean applyDiffFilter = difficulties != null && !difficulties.isEmpty();
        Set<Long> finalKnownWordIds = knownWordIds;
        String q = query.toLowerCase();

        return words.stream()
                .filter(word -> !Boolean.TRUE.equals(word.getIsProperNoun()))
                .filter(word -> !applyDiffFilter || difficulties.contains(word.getDifficulty()))
                .filter(word -> !onlyUnknown || !finalKnownWordIds.contains(word.getId()))
                .sorted(Comparator.comparingInt((Word word) -> {
                    String w = word.getWord().toLowerCase();
                    if (w.equals(q))     return 0; // exact match
                    if (w.startsWith(q)) return 1; // starts with
                    return 2;                       // contains in middle
                }).thenComparingInt(word -> word.getWord().length()).thenComparing(word -> word.getWord().toLowerCase()))
                .map(word -> convertToDTO(word, finalKnownWordIds.contains(word.getId())))
                .collect(Collectors.toList());
    }

    /**
     * Get word by ID
     */
    public WordDTO getWordById(Long id, Long userId) {
        Word word = wordRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Word not found: " + id));

        boolean isKnown = false;
        if (userId != null) {
            isKnown = userKnownWordRepository.existsByUserIdAndWordId(userId, id);
        }

        return convertToDTO(word, isKnown);
    }

    /**
     * Get most frequent words across all media
     */
    public List<WordDTO> getFrequentWords(String language, List<String> difficulties, int page, int size, Long userId, boolean onlyUnknown) {
        boolean applyDiffFilter = difficulties != null && !difficulties.isEmpty();
        
        List<Word> words = wordRepository.findTopFrequentWords(language, difficulties, applyDiffFilter, onlyUnknown, userId, PageRequest.of(page, size));

        Set<Long> knownWordIds = Set.of();
        if (userId != null) {
            knownWordIds = userKnownWordRepository.findByUserId(userId).stream()
                    .map(ukw -> ukw.getWord().getId())
                    .collect(Collectors.toSet());
        }

        Set<Long> finalKnownWordIds = knownWordIds;
        return words.stream()
                .map(word -> convertToDTO(word, finalKnownWordIds.contains(word.getId())))
                .collect(Collectors.toList());
    }

    /**
     * Convert Word entity to DTO
     */
    private WordDTO convertToDTO(Word word, boolean isKnown) {

        WordDTO dto = new WordDTO();
        dto.setId(word.getId());
        dto.setWord(word.getWord());
        dto.setLanguage(word.getLanguage());
        dto.setFrequency(word.getGlobalFrequency());
        dto.setIsKnown(isKnown);
        dto.setDefinition(word.getDefinition());
        dto.setDifficulty(word.getDifficulty());
        dto.setIsEnriched(word.getIsEnriched());
        dto.setIsProperNoun(word.getIsProperNoun());

        return dto;
    }

    @org.springframework.transaction.annotation.Transactional
    public void updateAllGlobalFrequencies() {
        wordRepository.updateGlobalFrequencies();
    }
}
