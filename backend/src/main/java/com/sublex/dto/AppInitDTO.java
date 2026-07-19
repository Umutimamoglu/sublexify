package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Aggregated payload for app startup. One round-trip instead of 8 —
 * critical on slow networks. User-specific fields are null for
 * anonymous callers (onboarding prefetch).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppInitDTO {
    // Public (also available to anonymous users)
    private List<MediaDTO> media;
    private List<WordDTO> frequentWords;

    // Requires authentication
    private EntitlementDTO entitlement;
    private List<MediaDTO> continueLearning;
    private List<WordListDTO> lists;
    private Map<String, Integer> userStatistics;
    private List<WordDTO> knownWords;
    private List<Long> watchedMediaIds;
    private ProgressStatsDTO progressStats;
}
