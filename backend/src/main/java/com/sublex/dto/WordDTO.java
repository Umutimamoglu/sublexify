package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WordDTO {
    private Long id;
    private String word;
    private String language;
    private Integer frequency; // How many times in media
    private Boolean isKnown; // For authenticated users

    // AI Enrichment Fields
    private com.sublex.model.WordDefinition definition;
    private String difficulty;
    private Boolean isEnriched;
    private Boolean isProperNoun;
}
