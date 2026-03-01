package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WordListWordsResponseDTO {
    private WordListDTO list;
    private List<WordDTO> words;
    private Integer totalWords;
    private Integer unknownWords;
    private Map<String, Long> levelCounts;
}
