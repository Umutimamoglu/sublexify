package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaWordsResponseDTO {
    private MediaDTO media;
    private List<WordDTO> words;
    private Integer totalWords;
    private Integer unknownWords; // For authenticated users
    private java.util.Map<String, Long> levelCounts;
}
