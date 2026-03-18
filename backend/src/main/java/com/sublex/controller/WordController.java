package com.sublex.controller;

import com.sublex.dto.WordDTO;
import com.sublex.service.UserKnownWordService;
import com.sublex.service.WordService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/words")
@RequiredArgsConstructor
public class WordController {

    private final WordService wordService;
    private final UserKnownWordService userKnownWordService;

    /**
     * GET /api/words/search?q=chemistry&language=en&userId=1
     * Search words
     */
    @GetMapping("/search")
    public ResponseEntity<List<WordDTO>> searchWords(
            @RequestParam String q,
            @RequestParam(defaultValue = "en") String language,
            @RequestParam(required = false) Long userId,
            Authentication authentication) {
        Long resolvedUserId = resolveUserId(userId, authentication);
        return ResponseEntity.ok(wordService.searchWords(q, language, resolvedUserId));
    }

    /**
     * GET /api/words/{id}?userId=1
     * Get word details
     */
    @GetMapping("/{id}")
    public ResponseEntity<WordDTO> getWordById(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId,
            Authentication authentication) {
        Long resolvedUserId = resolveUserId(userId, authentication);
        return ResponseEntity.ok(wordService.getWordById(id, resolvedUserId));
    }

    /**
     * GET /api/words/frequent?language=en&limit=100&userId=1
     * Get most frequent words
     */
    @GetMapping("/frequent")
    public ResponseEntity<List<WordDTO>> getFrequentWords(
            @RequestParam(defaultValue = "en") String language,
            @RequestParam(required = false) List<String> difficulties,
            @RequestParam(defaultValue = "100") Integer limit,
            @RequestParam(defaultValue = "false") boolean onlyUnknown,
            @RequestParam(required = false) Long userId,
            Authentication authentication) {
        Long resolvedUserId = resolveUserId(userId, authentication);
        return ResponseEntity.ok(wordService.getFrequentWords(language, difficulties, limit, resolvedUserId, onlyUnknown));
    }

    private Long resolveUserId(Long paramUserId, Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof Long) {
            return (Long) authentication.getPrincipal();
        }
        return paramUserId;
    }

    /**
     * POST /api/words/{id}/mark-known?userId=1
     * Mark word as known (requires userId param for now, will use auth in Sprint 4)
     */
    @PostMapping("/{id}/mark-known")
    public ResponseEntity<Void> markAsKnown(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        userKnownWordService.markWordAsKnown(userId, id);
        return ResponseEntity.ok().build();
    }

    /**
     * POST /api/words/mark-known-batch?userId=1&mediaId=123&levels=A1,A2
     * Mark multiple words as known by media and levels
     */
    @PostMapping("/mark-known-batch")
    public ResponseEntity<Void> markAsKnownBatch(
            Authentication authentication,
            @RequestParam Long mediaId,
            @RequestParam List<String> levels) {
        Long userId = (Long) authentication.getPrincipal();
        userKnownWordService.markWordsAsKnownByMediaAndLevels(userId, mediaId, levels);
        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/words/{id}/mark-known?userId=1
     * Unmark word as known
     */
    @DeleteMapping("/{id}/mark-known")
    public ResponseEntity<Void> unmarkAsKnown(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        userKnownWordService.unmarkWordAsKnown(userId, id);
        return ResponseEntity.ok().build();
    }
}
