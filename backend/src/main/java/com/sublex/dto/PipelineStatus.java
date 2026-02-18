package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PipelineStatus {

    public enum Step {
        IDLE, WORKER, SHERIFF, SPECIALIST, JUDGE, COMPLETE, FAILED
    }

    @Builder.Default
    private Step currentStep = Step.IDLE;

    private int totalWords;
    private int processedWords;
    private int progressPercent;

    @Builder.Default
    private List<FailedWord> failedWords = new ArrayList<>();

    @Builder.Default
    private Map<String, Long> stepTimings = new HashMap<>();

    private int judgeQueueSize;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private boolean running;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FailedWord {
        private String word;
        private String step;
        private String error;
    }
}
