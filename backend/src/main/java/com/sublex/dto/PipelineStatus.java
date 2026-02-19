package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Value;
import lombok.With;
import lombok.extern.jackson.Jacksonized;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Value
@With
@Builder(toBuilder = true)
@Jacksonized
@AllArgsConstructor
public class PipelineStatus {

    public enum Step {
        IDLE, WORKER, SHERIFF, SPECIALIST, JUDGE, COMPLETE, FAILED
    }

    @Builder.Default
    Step currentStep = Step.IDLE;

    int totalWords;
    int processedWords;
    int progressPercent;

    @Builder.Default
    List<FailedWord> failedWords = new ArrayList<>();

    @Builder.Default
    Map<String, Long> stepTimings = new HashMap<>();

    int judgeQueueSize;
    LocalDateTime startedAt;
    LocalDateTime completedAt;
    boolean running;

    @Value
    @Builder
    @Jacksonized
    public static class FailedWord {
        String word;
        String step;
        String error;
    }
}
