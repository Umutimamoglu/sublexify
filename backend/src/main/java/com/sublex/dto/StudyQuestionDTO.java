package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudyQuestionDTO {
    private Long wordId;
    private String word;
    private String definition;
    private String difficulty;
    private String questionType; // MULTIPLE_CHOICE, FILL_IN_THE_BLANKS, LISTENING
    private List<String> choices; // For multiple choice / listening
    private String correctAnswer;
    private String contextSentence;
    private String pos;
}
