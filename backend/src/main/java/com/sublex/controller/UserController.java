package com.sublex.controller;

import com.sublex.dto.WordDTO;
import com.sublex.service.UserKnownWordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserKnownWordService userKnownWordService;

    /**
     * GET /api/user/known-words?userId=1
     * Get user's known words
     */
    @GetMapping("/known-words")
    public ResponseEntity<List<WordDTO>> getKnownWords(@RequestParam Long userId) {
        return ResponseEntity.ok(userKnownWordService.getUserKnownWords(userId));
    }

    /**
     * GET /api/user/statistics?userId=1
     * Get learning statistics
     */
    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Integer>> getStatistics(@RequestParam Long userId) {
        return ResponseEntity.ok(userKnownWordService.getUserStatistics(userId));
    }
}
