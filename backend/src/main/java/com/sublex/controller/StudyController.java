package com.sublex.controller;

import com.sublex.dto.StudyQuestionDTO;
import com.sublex.dto.StudyResultDTO;
import com.sublex.service.StudyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/study")
@RequiredArgsConstructor
public class StudyController {

    private final StudyService studyService;

    @GetMapping("/next-batch")
    public ResponseEntity<List<StudyQuestionDTO>> getNextBatch(
            @RequestParam Long userId,
            @RequestParam Long listId,
            @RequestParam(defaultValue = "10") Integer size) {
        return ResponseEntity.ok(studyService.getNextBatch(userId, listId, size));
    }

    @PostMapping("/result")
    public ResponseEntity<Void> processStudyResults(
            @RequestParam Long userId,
            @RequestBody List<StudyResultDTO> results) {
        studyService.processStudyResults(userId, results);
        return ResponseEntity.ok().build();
    }
}
