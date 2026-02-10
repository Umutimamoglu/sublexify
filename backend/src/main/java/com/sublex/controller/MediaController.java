package com.sublex.controller;

import com.sublex.dto.MediaDTO;
import com.sublex.dto.MediaWordsResponseDTO;
import com.sublex.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;

    /**
     * GET /api/media
     * Get all available media
     */
    @GetMapping
    public ResponseEntity<List<MediaDTO>> getAllMedia() {
        return ResponseEntity.ok(mediaService.getAllMedia());
    }

    /**
     * GET /api/media/{id}
     * Get specific media details
     */
    @GetMapping("/{id}")
    public ResponseEntity<MediaDTO> getMediaById(@PathVariable Long id) {
        return ResponseEntity.ok(mediaService.getMediaById(id));
    }

    /**
     * GET /api/media/{id}/words
     * Get all words from media
     * Query params:
     * - onlyUnknown: filter to show only unknown words (requires userId)
     * - userId: user ID for filtering known words
     */
    @GetMapping("/{id}/words")
    public ResponseEntity<MediaWordsResponseDTO> getMediaWords(
            @PathVariable Long id,
            @RequestParam(required = false) Boolean onlyUnknown,
            @RequestParam(required = false) Long userId) {

        return ResponseEntity.ok(mediaService.getMediaWords(id, userId, onlyUnknown != null && onlyUnknown));
    }
}
