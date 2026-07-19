package com.sublex.controller;

import com.sublex.dto.ProgressStatsDTO;
import com.sublex.dto.WordDTO;
import com.sublex.service.ProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @GetMapping("/stats")
    public ResponseEntity<ProgressStatsDTO> getStats(org.springframework.security.core.Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(progressService.getStats(userId));
    }

    @GetMapping("/words/learnt")
    public ResponseEntity<List<WordDTO>> getLearntWords(org.springframework.security.core.Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(progressService.getLearntWords(userId));
    }

    @GetMapping("/words/studied")
    public ResponseEntity<List<WordDTO>> getStudiedWords(org.springframework.security.core.Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(progressService.getStudiedWords(userId));
    }

    @GetMapping("/words/due")
    public ResponseEntity<List<WordDTO>> getDueWords(org.springframework.security.core.Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(progressService.getDueWords(userId));
    }

    @GetMapping("/words/difficult")
    public ResponseEntity<List<WordDTO>> getDifficultWords(org.springframework.security.core.Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(progressService.getDifficultWords(userId));
    }

    @GetMapping("/words/notes")
    public ResponseEntity<List<WordDTO>> getWordsWithNotes(org.springframework.security.core.Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(progressService.getWordsWithNotes(userId));
    }
}
