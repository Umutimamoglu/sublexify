package com.sublex.repository;

import com.sublex.model.MediaType;

import java.time.LocalDateTime;

public interface MediaProjection {
    Long getId();
    String getTitle();
    String getImdbId();
    MediaType getType();
    String getLanguage();
    String getOverview();
    String getPosterUrl();
    String getBackdropUrl();
    Long getTmdbId();
    Integer getSeasonNumber();
    Integer getEpisodeNumber();
    Double getVoteAverage();
    LocalDateTime getCreatedAt();
    boolean getIsPremium();
}
