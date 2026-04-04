package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WordListDTO {
    private Long id;
    private String name;
    private Integer totalWords;
    private Integer unknownWords;
    private Boolean isSystem;
    private Map<String, Long> levelCounts;
    private LocalDateTime createdAt;
    private String color;
}
