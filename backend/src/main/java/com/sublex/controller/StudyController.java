package com.sublex.controller;

import com.sublex.dto.StudyQuestionDTO;
import com.sublex.dto.StudyResultDTO;
import com.sublex.service.StudyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/study")
@RequiredArgsConstructor
public class StudyController {

    private final StudyService studyService;

    @GetMapping("/next-batch")
    public ResponseEntity<List<StudyQuestionDTO>> getNextBatch(
            Authentication authentication,
            @RequestParam Long listId,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) List<String> types) {
        System.out.println("====== NEXT BATCH REQUEST ======");
        System.out.println("ListId: " + listId + ", Size: " + size);
        System.out.println("Types received: " + types);
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(studyService.getNextBatch(userId, listId, size, types));
    }

    @PostMapping("/result")
    public ResponseEntity<Void> processStudyResults(
            Authentication authentication,
            @RequestBody List<StudyResultDTO> results) {
        Long userId = (Long) authentication.getPrincipal();
        studyService.processStudyResults(userId, results);
        return ResponseEntity.ok().build();
    }
}
