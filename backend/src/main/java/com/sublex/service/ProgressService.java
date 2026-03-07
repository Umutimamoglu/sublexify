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

    public ProgressStatsDTO getStats(Long userId) {
        Long total = userWordProgressRepository.countByUserId(userId);
        Long highRetention = userWordProgressRepository.countHighRetentionWordsByUserId(userId);
        Long toReview = userWordProgressRepository.countWordsToReviewByUserId(userId);
        
        return ProgressStatsDTO.builder()
                .totalWordsStudied(total != null ? total : 0)
                .highRetentionWords(highRetention != null ? highRetention : 0)
                .wordsToReviewToday(toReview != null ? toReview : 0)
                .build();
    }
}
