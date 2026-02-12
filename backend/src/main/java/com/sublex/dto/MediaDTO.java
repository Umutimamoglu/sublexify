package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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
}
