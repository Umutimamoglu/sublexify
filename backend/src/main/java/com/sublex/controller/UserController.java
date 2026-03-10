package com.sublex.controller;

import com.sublex.dto.WordDTO;
import com.sublex.service.UserKnownWordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserKnownWordService userKnownWordService;

    /**
     * GET /api/user/known-words
     * Get user's known words
     */
    @GetMapping("/known-words")
    public ResponseEntity<List<WordDTO>> getKnownWords(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(userKnownWordService.getUserKnownWords(userId));
    }

    /**
     * GET /api/user/statistics
     * Get learning statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Integer>> getStatistics(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(userKnownWordService.getUserStatistics(userId));
    }
}
