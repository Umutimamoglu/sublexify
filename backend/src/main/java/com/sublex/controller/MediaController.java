import com.sublex.dto.MediaDTO;
import com.sublex.dto.MediaWordsResponseDTO;
import com.sublex.service.MediaService;
import com.sublex.service.TmdbService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
public class MediaController {

    private final MediaService mediaService;
    private final TmdbService tmdbService;


    /**
     * GET /api/media
     * Get all available media
     */
    @GetMapping
    public ResponseEntity<List<MediaDTO>> getAllMedia(Authentication authentication) {
        Long userId = (authentication != null) ? (Long) authentication.getPrincipal() : null;
        return ResponseEntity.ok(mediaService.getAllMedia(userId));
    }

    /**
     * GET /api/media/continue-learning
     * Get media that the user has started learning from
     */
    @GetMapping("/continue-learning")
    public ResponseEntity<List<MediaDTO>> getContinueLearning(
            Authentication authentication,
            @RequestParam(defaultValue = "10") Integer limit) {

        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(mediaService.getRecentMediaForUser(userId, limit));
    }

    /**
     * GET /api/media/series/{imdbId}/episodes
     * Get all episodes for a series, sorted by season and episode number
     */
    @GetMapping("/series/{imdbId}/episodes")
    public ResponseEntity<List<MediaDTO>> getSeriesEpisodes(@PathVariable String imdbId) {
        return ResponseEntity.ok(mediaService.getSeriesEpisodes(imdbId));
    }

    /**
     * GET /api/media/{id}
     * Get specific media details
     */
    @GetMapping("/{id}")
    public ResponseEntity<MediaDTO> getMediaById(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = (authentication != null) ? (Long) authentication.getPrincipal() : null;
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
            @RequestParam(required = false) String sortBy,
            Authentication authentication) {
        Long userId = (authentication != null) ? (Long) authentication.getPrincipal() : null;
        return ResponseEntity.ok(mediaService.getMediaWords(id, userId, onlyUnknown != null && onlyUnknown, sortBy));
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
                onlyUnknown != null && onlyUnknown, null);

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

    @GetMapping("/tmdb/search")
    public ResponseEntity<List<TmdbService.TmdbMedia>> searchTmdb(
            @RequestParam String query,
            @RequestParam(required = false, defaultValue = "movie") String type) {
        boolean isSeries = "tv".equalsIgnoreCase(type) || "series".equalsIgnoreCase(type);
        if (isSeries) {
            return ResponseEntity.ok(tmdbService.searchSeries(query));
        } else {
            return ResponseEntity.ok(tmdbService.searchMovies(query));
        }
    }
}

