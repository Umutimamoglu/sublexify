package com.sublex.controller;

import com.sublex.model.Media;
import com.sublex.repository.MediaRepository;
import com.sublex.service.SubtitleProcessingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final MediaRepository mediaRepository;
    private final SubtitleProcessingService subtitleProcessingService;

    /**
     * Create a new media entry
     */
    @PostMapping("/media")
    public ResponseEntity<Media> createMedia(@RequestBody Media media) {
        Media savedMedia = mediaRepository.save(media);
        return ResponseEntity.ok(savedMedia);
    }

    /**
     * Upload subtitle file for a media
     */
    @PostMapping("/media/{mediaId}/subtitles")
    public ResponseEntity<String> uploadSubtitles(
            @PathVariable Long mediaId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "en") String language) {

        try {
            // Read file content
            String subtitleContent = new String(file.getBytes(), StandardCharsets.UTF_8);

            // Process subtitles
            subtitleProcessingService.processSubtitles(mediaId, subtitleContent, language);

            return ResponseEntity.ok("Subtitles processed successfully");
        } catch (IOException e) {
            return ResponseEntity.badRequest().body("Error reading file: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error processing subtitles: " + e.getMessage());
        }
    }

    /**
     * Get all media
     */
    @GetMapping("/media")
    public ResponseEntity<?> getAllMedia() {
        return ResponseEntity.ok(mediaRepository.findAll());
    }

    /**
     * Delete media
     */
    @DeleteMapping("/media/{id}")
    public ResponseEntity<String> deleteMedia(@PathVariable Long id) {
        mediaRepository.deleteById(id);
        return ResponseEntity.ok("Media deleted successfully");
    }
}
