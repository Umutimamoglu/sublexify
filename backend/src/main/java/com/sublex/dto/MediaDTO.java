package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaDTO {
    private Long id;
    private String title;
    private String imdbId;
    private String type;
    private String language;
    private Integer totalWords;
    private String overview;
    private String posterUrl;
    private String backdropUrl;
    private Long tmdbId;
    private Integer seasonNumber;
    private Integer episodeNumber;
    private Double voteAverage;
    private LocalDateTime createdAt;

    // Premium gating
    private Boolean isPremium;   // admin-marked as premium content
    private Boolean locked;      // true when this caller lacks entitlement (word list withheld)
    private Integer lockedCount; // how many words are hidden behind the paywall

    // Personalized difficulty fields
    private Double knownWordPercentage;
    private String difficultyLevel; // e.g. B2, C1 -> dominant level
    private String overallDifficulty; // EASY, MEDIUM, HARD
    private Map<String, Long> levelCounts;
    
    // Smart Routing
    private Long generatedListId;
}

