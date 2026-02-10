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
}
