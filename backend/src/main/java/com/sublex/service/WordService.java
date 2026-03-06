package com.sublex.service;

import com.sublex.dto.WordDTO;
import com.sublex.model.Word;
import com.sublex.repository.MediaWordRepository;
import com.sublex.repository.UserKnownWordRepository;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

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
    public List<WordDTO> searchWords(String query, String language, Long userId) {
        List<Word> words = wordRepository.findByWordContainingAndLanguage(query.toLowerCase(), language);

        // Get known word IDs if user provided
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
    public List<WordDTO> getFrequentWords(String language, Integer limit, Long userId) {
        // This is a simplified version - for production, use custom query
        List<Word> words = wordRepository.findByLanguage(language, PageRequest.of(0, limit));

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
        // Get total frequency across all media
        int totalFrequency = mediaWordRepository.findByWordId(word.getId()).stream()
                .mapToInt(mw -> mw.getCount())
                .sum();

        WordDTO dto = new WordDTO();
        dto.setId(word.getId());
        dto.setWord(word.getWord());
        dto.setLanguage(word.getLanguage());
        dto.setFrequency(totalFrequency);
        dto.setIsKnown(isKnown);
        dto.setDefinition(word.getDefinition());
        dto.setDifficulty(word.getDifficulty());
        dto.setIsEnriched(word.getIsEnriched());
        dto.setIsProperNoun(word.getIsProperNoun());

        return dto;
    }
}
