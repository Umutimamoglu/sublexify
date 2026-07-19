package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProgressStatsDTO {
    private long totalWordsLearnt;
    private long totalWordsStudied;
    private long difficultWords;
    private long wordsToReviewToday;
    private long notesCount;
}
