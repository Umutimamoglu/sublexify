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
    public ResponseEntity<List<MediaDTO>> getAllMedia(@RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(mediaService.getAllMedia(userId));
    }

    /**
     * GET /api/media/continue-learning
     * Get media that the user has started learning from
     */
    @GetMapping("/continue-learning")
    public ResponseEntity<List<MediaDTO>> getContinueLearning(
            @RequestParam(required = false) Long userId,
            @RequestParam(defaultValue = "10") Integer limit) {

        // For now, use hardcoded user ID 1L if not provided
        Long idToUse = (userId != null) ? userId : 1L;
        return ResponseEntity.ok(mediaService.getRecentMediaForUser(idToUse, limit));
    }

    /**
     * GET /api/media/{id}
     * Get specific media details
     */
    @GetMapping("/{id}")
    public ResponseEntity<MediaDTO> getMediaById(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(mediaService.getMediaById(id, userId));
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

    /**
     * GET /api/media/{id}/download-subtitles
     * Download subtitles as a .txt file
     */
    @GetMapping("/{id}/download-subtitles")
    public ResponseEntity<byte[]> downloadSubtitles(
            @PathVariable Long id,
            @RequestParam(required = false) Long userId) {
        MediaDTO media = mediaService.getMediaById(id, userId);
        String content = mediaService.getSubtitleContent(id);

        if (content == null || content.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        byte[] data = content.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String filename = media.getTitle().replaceAll("[^a-zA-Z0-9.-]", "_") + ".txt";

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"")
                .header(org.springframework.http.HttpHeaders.CONTENT_TYPE,
                        org.springframework.http.MediaType.TEXT_PLAIN_VALUE)
                .body(data);
    }

    /**
     * GET /api/media/{id}/words/download
     * Download media words as a .json file
     */
    @GetMapping("/{id}/words/download")
    public ResponseEntity<byte[]> downloadMediaWords(
            @PathVariable Long id,
            @RequestParam(required = false) Boolean onlyUnknown,
            @RequestParam(required = false) Long userId) {

        MediaDTO media = mediaService.getMediaById(id, userId);
        MediaWordsResponseDTO wordsResponse = mediaService.getMediaWords(id, userId,
                onlyUnknown != null && onlyUnknown);

        try {
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            byte[] data = mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(wordsResponse);

            String filename = media.getTitle().replaceAll("[^a-zA-Z0-9.-]", "_") + "_vocabulary.json";

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .header(org.springframework.http.HttpHeaders.CONTENT_TYPE,
                            org.springframework.http.MediaType.APPLICATION_JSON_VALUE)
                    .body(data);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
