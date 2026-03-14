package com.sublex.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WordAnalysisResultDTO {
    private String word;
    private String root;
    private String difficulty;

    @JsonProperty("is_proper_noun")
    private Boolean isProperNoun;

    private String language;
}
