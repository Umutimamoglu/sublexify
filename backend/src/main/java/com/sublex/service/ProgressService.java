package com.sublex.service;

import com.sublex.dto.ProgressStatsDTO;
import com.sublex.model.UserWordProgress;
import com.sublex.repository.UserWordProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProgressService {

    private final UserWordProgressRepository userWordProgressRepository;
    private final com.sublex.repository.UserWordNoteRepository userWordNoteRepository;

    public ProgressStatsDTO getStats(Long userId) {
        Long totalLearnt = userWordProgressRepository.countByUserId(userId);
        Long totalStudied = userWordProgressRepository.countWordsStudiedByUserId(userId);
        Long difficult = userWordProgressRepository.countDifficultWordsByUserId(userId);
        Long toReview = userWordProgressRepository.countWordsToReviewByUserId(userId);
        Long notesCount = userWordNoteRepository.countByUserId(userId);

        return ProgressStatsDTO.builder()
                .totalWordsLearnt(totalLearnt != null ? totalLearnt : 0)
                .totalWordsStudied(totalStudied != null ? totalStudied : 0)
                .difficultWords(difficult != null ? difficult : 0)
                .wordsToReviewToday(toReview != null ? toReview : 0)
                .notesCount(notesCount != null ? notesCount : 0)
                .build();
    }

    public List<com.sublex.dto.WordDTO> getLearntWords(Long userId) {
        return mapToWordDTOs(userWordProgressRepository.findLearntWordsByUserId(userId));
    }

    public List<com.sublex.dto.WordDTO> getStudiedWords(Long userId) {
        return mapToWordDTOs(userWordProgressRepository.findStudiedWordsByUserId(userId));
    }

    public List<com.sublex.dto.WordDTO> getDueWords(Long userId) {
        return mapToWordDTOs(userWordProgressRepository.findDueWordsByUserId(userId));
    }

    public List<com.sublex.dto.WordDTO> getDifficultWords(Long userId) {
        return mapToWordDTOs(userWordProgressRepository.findDifficultWordsByUserId(userId));
    }

    public List<com.sublex.dto.WordDTO> getWordsWithNotes(Long userId) {
        return userWordNoteRepository.findAllByUserIdWithWord(userId).stream()
                .map(noteEntity -> {
                    com.sublex.model.Word word = noteEntity.getWord();
                    com.sublex.dto.WordDTO dto = new com.sublex.dto.WordDTO();
                    dto.setId(word.getId());
                    dto.setWord(word.getWord());
                    dto.setLanguage(word.getLanguage());
                    dto.setDifficulty(word.getDifficulty());
                    dto.setIsKnown(true); // Default or query actual known status if needed. Usually listed as known if it has a note?
                    dto.setIsEnriched(word.getIsEnriched());
                    dto.setIsProperNoun(word.getIsProperNoun());
                    dto.setDefinition(word.getDefinition());
                    dto.setContextSentence(word.getContextSentence());
                    dto.setNote(noteEntity.getNote());
                    return dto;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    private List<com.sublex.dto.WordDTO> mapToWordDTOs(List<UserWordProgress> progressList) {
        return progressList.stream()
                .map(p -> {
                    com.sublex.model.Word word = p.getWord();
                    com.sublex.dto.WordDTO dto = new com.sublex.dto.WordDTO();
                    dto.setId(word.getId());
                    dto.setWord(word.getWord());
                    dto.setLanguage(word.getLanguage());
                    dto.setDifficulty(word.getDifficulty());
                    dto.setIsKnown(true);
                    dto.setIsEnriched(word.getIsEnriched());
                    dto.setIsProperNoun(word.getIsProperNoun());
                    dto.setDefinition(word.getDefinition());
                    dto.setContextSentence(word.getContextSentence());
                    return dto;
                })
                .collect(java.util.stream.Collectors.toList());
    }
}
