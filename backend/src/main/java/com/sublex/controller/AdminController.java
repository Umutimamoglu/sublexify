package com.sublex.controller;

import com.sublex.model.Media;
import com.sublex.repository.MediaRepository;
import com.sublex.repository.MediaWordRepository;
import com.sublex.repository.WordRepository;
import com.sublex.service.SubtitleProcessingService;
import com.sublex.service.SubtitleScraperService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.sublex.model.MediaType;
import com.sublex.service.TmdbService;
import com.sublex.util.FilenameParser;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final MediaRepository mediaRepository;
    private final MediaWordRepository mediaWordRepository;
    private final WordRepository wordRepository;
    private final SubtitleProcessingService subtitleProcessingService;
    private final TmdbService tmdbService;
    private final SubtitleScraperService subtitleScraperService;
    private final com.sublex.service.StandardListSeeder standardListSeeder;

    // ... (other methods unchanged) ...

    @GetMapping("/stats/word-count")
    public ResponseEntity<Long> getTotalWordCount() {
        return ResponseEntity.ok(wordRepository.count());
    }

    @PostMapping("/lists/seed/defaults")
    public ResponseEntity<String> seedDefaultLists() {
        log.info("Request to seed default lists");
        try {
            String result = standardListSeeder.seedDefaults();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to seed default lists", e);
            return ResponseEntity.internalServerError().body("Failed to seed lists: " + e.getMessage());
        }
    }

    /**
     * Batch upload subtitles with auto-detection
     */
    @PostMapping("/media/batch-upload")
    public ResponseEntity<List<String>> batchUpload(@RequestParam("files") MultipartFile[] files,
            @RequestParam(defaultValue = "en") String language) {
        log.info("Batch upload request received with {} files", files.length);

        // Process files in parallel
        List<String> results = java.util.Arrays.stream(files)
                .map(file -> {
                    try {
                        log.info("Processing file: {} on thread: {}", file.getOriginalFilename(),
                                Thread.currentThread().getName());
                        String result = processUploadedFile(file, language);
                        log.info("File processed successfully: {}", result);
                        return result;
                    } catch (Exception e) {
                        log.error("Error processing file {}", file.getOriginalFilename(), e);
                        return "Error processing " + file.getOriginalFilename() + ": " + e.getMessage();
                    }
                })
                .collect(java.util.stream.Collectors.toList());

        return ResponseEntity.ok(results);
    }

    private String processUploadedFile(MultipartFile file, String language) throws IOException {
        String filename = file.getOriginalFilename();
        FilenameParser.MediaInfo info = FilenameParser.parse(filename);
        log.debug("Parsed filename info: {}", info);

        // 1. Search TMDB
        Optional<TmdbService.TmdbMedia> tmdbMatch = tmdbService.searchAndMatch(info.title(), info.year(),
                info.isSeries());

        Media media = new Media();
        media.setTitle(info.title()); // Default title from filename
        media.setLanguage(language);

        if (tmdbMatch.isPresent()) {
            // Fetch full details to get IMDB ID
            Optional<TmdbService.TmdbMedia> fullDetails = tmdbService.getMediaDetails(tmdbMatch.get().getId(),
                    info.isSeries());
            TmdbService.TmdbMedia tmdb = fullDetails.orElse(tmdbMatch.get());

            log.info("TMDB match found: {}", tmdb);

            media.setTmdbId(tmdb.getId());
            media.setImdbId(tmdb.getImdbId());
            media.setTitle(tmdb.getTitle()); // Use TMDB title
            media.setOverview(tmdb.getOverview());
            if (tmdb.getPosterPath() != null) {
                media.setPosterUrl("https://image.tmdb.org/t/p/w500" + tmdb.getPosterPath());
            }
            if (tmdb.getBackdropPath() != null) {
                media.setBackdropUrl("https://image.tmdb.org/t/p/original" + tmdb.getBackdropPath());
            }
            media.setVoteAverage(tmdb.getVoteAverage());

            // If it's an episode, get episode details
            if (info.isSeries() && info.season() != null && info.episode() != null) {
                media.setType(MediaType.EPISODE);
                media.setSeasonNumber(info.season());
                media.setEpisodeNumber(info.episode());
                media.setTitle(tmdb.getTitle() + " S" + info.season() + "E" + info.episode());

                Optional<TmdbService.TmdbEpisode> epDetails = tmdbService.getEpisodeDetails(tmdb.getId(), info.season(),
                        info.episode());
                if (epDetails.isPresent()) {
                    TmdbService.TmdbEpisode ep = epDetails.get();
                    log.info("Episode details found: {}", ep.getName());
                    media.setTitle(tmdb.getTitle() + " - " + ep.getName());
                    media.setOverview(ep.getOverview());
                    if (ep.getStillPath() != null) {
                        media.setPosterUrl("https://image.tmdb.org/t/p/w500" + ep.getStillPath());
                    }
                    if (ep.getVoteAverage() != null) {
                        media.setVoteAverage(ep.getVoteAverage());
                    }
                }
            } else {
                media.setType(MediaType.MOVIE);
            }
        } else {
            // No match, fallback
            media.setType(info.isSeries() ? MediaType.EPISODE : MediaType.MOVIE);
            if (info.isSeries() && info.season() != null && info.episode() != null) {
                media.setSeasonNumber(info.season());
                media.setEpisodeNumber(info.episode());
            }
        }

        // Save Media
        log.debug("Saving media entity...");
        media = mediaRepository.save(media);
        log.info("Media saved with ID: {}", media.getId());

        // Process Subtitles
        log.debug("Processing subtitle content...");
        String content = new String(file.getBytes(), StandardCharsets.UTF_8);
        subtitleProcessingService.processSubtitles(media.getId(), content, language);

        return String.format("Processed %s as %s (ID: %d)", filename, media.getTitle(), media.getId());
    }

    @DeleteMapping("/media/{id}")
    @Transactional
    public ResponseEntity<Void> deleteMedia(@PathVariable Long id) {
        log.info("Deleting media with ID: {}", id);

        // Delete related MediaWords first
        mediaWordRepository.deleteByMediaId(id);

        // Delete Media
        mediaRepository.deleteById(id);

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/media/scrape")
    public ResponseEntity<String> scrapeMedia(@RequestParam String imdbId) {
        log.info("Received request to scrape media with IMDB ID: {}", imdbId);
        try {
            subtitleScraperService.scrapeAndProcess(imdbId);
            return ResponseEntity.ok("Scraping started successfully for " + imdbId);
        } catch (Exception e) {
            log.error("Scraping failed: ", e);
            return ResponseEntity.internalServerError().body("Scraping failed: " + e.getMessage());
        }
    }

    @PostMapping("/media/scrape-episode")
    public ResponseEntity<String> scrapeEpisode(@RequestParam String imdbId, @RequestParam Integer season,
            @RequestParam Integer episode) {
        log.info("Received request to scrape episode with IMDB ID: {}, S{}E{}", imdbId, season, episode);
        try {
            subtitleScraperService.scrapeEpisode(imdbId, season, episode);
            return ResponseEntity.ok("Scraping started successfully for " + imdbId + " S" + season + "E" + episode);
        } catch (Exception e) {
            log.error("Scraping failed: ", e);
            return ResponseEntity.internalServerError().body("Scraping failed: " + e.getMessage());
        }
    }

    // TMDB Proxy Endpoints for Frontend

    @GetMapping("/media/tmdb/search")
    public ResponseEntity<List<TmdbService.TmdbMedia>> searchTmdbSeries(@RequestParam String query) {
        return ResponseEntity.ok(tmdbService.searchSeries(query));
    }

    @GetMapping("/media/tmdb/series/{id}")
    public ResponseEntity<TmdbService.TmdbMedia> getTmdbSeries(@PathVariable Long id) {
        return tmdbService.getMediaDetails(id, true)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/media/tmdb/series/{id}/season/{season}")
    public ResponseEntity<TmdbService.TmdbSeasonDetails> getTmdbSeason(@PathVariable Long id,
            @PathVariable int season) {
        return tmdbService.getSeasonDetails(id, season)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
