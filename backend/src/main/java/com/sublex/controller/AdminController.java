package com.sublex.controller;

import com.sublex.model.Media;
import com.sublex.repository.MediaRepository;
import com.sublex.repository.MediaWordRepository;
import com.sublex.repository.WordRepository;
import com.sublex.service.EnrichmentService;
import com.sublex.service.MediaService;
import com.sublex.service.SubtitleProcessingService;
import com.sublex.service.SubtitleScraperService;
import io.swagger.v3.oas.annotations.Operation;
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
    private final EnrichmentService enrichmentService;
    private final com.sublex.service.AuditService auditService;
    private final com.sublex.service.SpecialistService specialistService;
    private final com.sublex.service.PipelineService pipelineService;
    private final com.sublex.service.WordAnalysisService wordAnalysisService;

    // ... (other methods unchanged) ...

    @PostMapping("/word-analysis/trigger")
    @Operation(summary = "Triggers async word analysis job manually")
    public ResponseEntity<String> triggerWordAnalysis() {
        wordAnalysisService.triggerAnalysis();
        return ResponseEntity.ok("Word analysis triggered.");
    }

    @DeleteMapping("/words/all")
    @Transactional
    @Operation(summary = "Deletes all words and media-word associations (Keeps Media)")
    public ResponseEntity<String> deleteAllWords() {
        log.warn("Request to delete ALL words received.");
        mediaWordRepository.deleteAll();
        wordRepository.deleteAll();
        return ResponseEntity.ok("All words and media-word associations deleted.");
    }

    @PostMapping("/words/clear-translations")
    @Transactional
    @Operation(summary = "Clears translations (definition, enriched status) but keeps analysis (difficulty, root)")
    public ResponseEntity<String> clearTranslations(@RequestParam(defaultValue = "en") String language) {
        log.warn("Request to CLEAR TRANSLATIONS for language: {}", language);
        wordRepository.clearAllTranslations(language);
        return ResponseEntity.ok("Translations cleared for " + language + ". Analysis data preserved.");
    }

    @DeleteMapping("/system/reset")
    @Transactional
    @Operation(summary = "FULL RESET: Deletes Media, Words, and Associations")
    public ResponseEntity<String> fullSystemReset() {
        log.warn("Request to FULL SYSTEM RESET received.");
        mediaWordRepository.deleteAll();
        wordRepository.deleteAll();
        mediaRepository.deleteAll();
        return ResponseEntity.ok("FULL SYSTEM RESET COMPLETED. All Media and Words deleted.");
    }

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

    @PostMapping("/lists/seed/oxford")
    public ResponseEntity<String> seedOxfordList() {
        log.info("Request to seed Oxford 5000 list");
        try {
            String result = standardListSeeder.seedOxfordList();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to seed Oxford list", e);
            return ResponseEntity.internalServerError().body("Failed to seed Oxford list: " + e.getMessage());
        }
    }

    @PostMapping("/lists/seed/verbs-curated")
    public ResponseEntity<String> seedCuratedVerbs() {
        log.info("Request to seed curated verb list");
        try {
            String result = standardListSeeder.seedVerbJsonList("top_verbs_by_frequency.json");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to seed curated verb list", e);
            return ResponseEntity.internalServerError().body("Failed to seed curated verbs: " + e.getMessage());
        }
    }

    @PostMapping("/lists/seed/adjectives")
    public ResponseEntity<String> seedAdjectives() {
        log.info("Request to seed all adjectives from JSON");
        try {
            String result = standardListSeeder.seedFrequencyListJson("Top Adjectives",
                    "top_adjectives_by_frequency.json", null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to seed adjectives", e);
            return ResponseEntity.internalServerError().body("Failed to seed adjectives: " + e.getMessage());
        }
    }

    @PostMapping("/lists/seed/adverbs")
    public ResponseEntity<String> seedAdverbs() {
        log.info("Request to seed all adverbs from JSON");
        try {
            String result = standardListSeeder.seedFrequencyListJson("Top Adverbs", "top_adverbs_by_frequency.json",
                    null);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to seed adverbs", e);
            return ResponseEntity.internalServerError().body("Failed to seed adverbs: " + e.getMessage());
        }
    }

    @PostMapping("/lists/seed/phrasal-verbs")
    public ResponseEntity<String> seedPhrasalVerbs() {
        log.info("Request to seed all phrasal verbs from JSON");
        try {
            String result = standardListSeeder.seedPhrasalVerbJson("200 Common Phrasal Verbs", "phrasal_verbs.json");
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to seed phrasal verbs", e);
            return ResponseEntity.internalServerError().body("Failed to seed phrasal verbs: " + e.getMessage());
        }
    }

    @PostMapping("/lists/seed/adjectives-test")
    public ResponseEntity<String> seedAdjectivesTest() {
        log.info("Request to seed 20 test adjectives");
        try {
            String result = standardListSeeder.seedFrequencyListJson("Top 200 Adjectives",
                    "top_adjectives_by_frequency.json", 20);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Failed to seed test adjectives", e);
            return ResponseEntity.internalServerError().body("Failed to seed test adjectives: " + e.getMessage());
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
    @Operation(summary = "Triggers subtitle scraping for an episode via Scraper")
    public ResponseEntity<String> scrapeEpisode(@RequestParam String imdbId, @RequestParam Integer season,
            @RequestParam Integer episode) {
        log.info("Manual request to scrape subtitles for episode: {} S{}E{}", imdbId, season, episode);
        try {
            subtitleScraperService.scrapeEpisode(imdbId, season, episode);
            return ResponseEntity.ok("Scraping started successfully for " + imdbId + " S" + season + "E" + episode);
        } catch (Exception e) {
            log.error("Scraping failed for {} S{}E{}", imdbId, season, episode, e);
            return ResponseEntity.internalServerError().body("Scraping failed: " + e.getMessage());
        }
    }

    @PostMapping("/scrape-episode-api")
    @Operation(summary = "Triggers subtitle scraping for an episode via Official API")
    public ResponseEntity<String> scrapeEpisodeApi(@RequestParam String imdbId, @RequestParam Integer season,
            @RequestParam Integer episode) {
        log.info("Manual request to scrape subtitles via OFFICIAL API for: {} S{}E{}", imdbId, season, episode);
        try {
            subtitleScraperService.scrapeEpisodeWithApi(imdbId, season, episode);
            return ResponseEntity.ok("Official API Scraping completed for " + imdbId + " S" + season + "E" + episode);
        } catch (Exception e) {
            log.error("API Scraping failed for {} S{}E{}", imdbId, season, episode, e);
            return ResponseEntity.internalServerError().body("API Scraping failed: " + e.getMessage());
        }
    }

    @PostMapping("/scrape-movie-api")
    @Operation(summary = "Triggers subtitle scraping for a movie via Official API")
    public ResponseEntity<String> scrapeMovieApi(
            @RequestParam(required = false) String imdbId,
            @RequestParam(required = false) Long tmdbId) {
        log.info("Manual request to scrape subtitles via OFFICIAL API for movie. IMDB ID: {}, TMDB ID: {}", imdbId,
                tmdbId);
        try {
            if (tmdbId != null) {
                subtitleScraperService.scrapeMovieWithApi(tmdbId);
                return ResponseEntity.ok("Official API Scraping completed for movie TMDB ID: " + tmdbId);
            } else if (imdbId != null && !imdbId.isEmpty()) {
                subtitleScraperService.scrapeMovieWithApi(imdbId);
                return ResponseEntity.ok("Official API Scraping completed for movie IMDB ID: " + imdbId);
            } else {
                return ResponseEntity.badRequest().body("Either imdbId or tmdbId must be provided");
            }
        } catch (Exception e) {
            log.error("API Scraping failed for movie. IMDB ID: {}, TMDB ID: {}", imdbId, tmdbId, e);
            return ResponseEntity.internalServerError().body("API Scraping failed: " + e.getMessage());
        }
    }

    // TMDB Proxy Endpoints for Frontend

    @GetMapping("/media/tmdb/search")
    public ResponseEntity<List<TmdbService.TmdbMedia>> searchTmdbSeries(@RequestParam String query) {
        return ResponseEntity.ok(tmdbService.searchSeries(query));
    }

    @GetMapping("/media/tmdb/movie/search")
    public ResponseEntity<List<TmdbService.TmdbMedia>> searchTmdbMovies(@RequestParam String query) {
        return ResponseEntity.ok(tmdbService.searchMovies(query));
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

    @PostMapping("/enrich-batch")
    @Operation(summary = "Triggers AI enrichment for the next batch of pending words")
    public ResponseEntity<String> enrichBatch() {
        log.info("Manual request to trigger AI enrichment batch");
        try {
            enrichmentService.enrichPendingWords();
            return ResponseEntity.ok("Enrichment batch completed successfully");
        } catch (Exception e) {
            log.error("Enrichment batch failed", e);
            return ResponseEntity.internalServerError().body("Enrichment failed: " + e.getMessage());
        }
    }

    @PostMapping("/media/{id}/enrich")
    @Operation(summary = "Triggers AI enrichment for a specific media's pending words")
    public ResponseEntity<String> enrichMediaBatch(@PathVariable Long id) {
        log.info("Manual request to trigger AI enrichment for media: {}", id);
        try {
            enrichmentService.enrichWordsForMedia(id);
            return ResponseEntity.ok("Enrichment for media " + id + " completed successfully");
        } catch (Exception e) {
            log.error("Enrichment for media {} failed", id, e);
            return ResponseEntity.internalServerError().body("Enrichment failed: " + e.getMessage());
        }
    }

    @PostMapping("/audit-batch")
    @Operation(summary = "Triggers the Sheriff (Gemini 1.5 Pro) to audit recently enriched words")
    public ResponseEntity<String> auditBatch(@RequestParam(defaultValue = "50") int size) {
        log.info("Manual request to trigger Sheriff audit for last {} words", size);
        try {
            auditService.auditRecentWords(size);
            return ResponseEntity.ok("Audit batch completed successfully");
        } catch (Exception e) {
            log.error("Audit batch failed", e);
            return ResponseEntity.internalServerError().body("Audit failed: " + e.getMessage());
        }
    }

    @GetMapping("/words/enriched/dates")
    public ResponseEntity<List<String>> getEnrichedDates(
            @RequestParam(defaultValue = "en") String language) {
        return ResponseEntity.ok(wordRepository.findDistinctEnrichedDates(language));
    }

    @PostMapping("/specialist-fix")
    public ResponseEntity<String> triggerSpecialistFix(
            @RequestParam(defaultValue = "en") String language,
            @RequestParam(defaultValue = "10") int limit) {
        specialistService.fixFlaggedWords(language, limit, java.time.LocalDateTime.now());
        return ResponseEntity.ok("Specialist correction loop triggered for " + limit + " words.");
    }

    @PostMapping("/pipeline/specialist-global-fix")
    @Operation(summary = "Fixes ALL flagged words in the DB in parallel (ignoring media)")
    public ResponseEntity<String> triggerGlobalSpecialistFix(
            @RequestParam(defaultValue = "en") String language) {
        log.info("Triggering Global Specialist Fix for language: {}", language);
        // We run this in a background thread or virtual thread to avoid blocking the
        // request
        java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor().submit(() -> {
            try {
                specialistService.fixAllFlaggedWords(language);
            } catch (Exception e) {
                log.error("Global Specialist Fix job failed", e);
            }
        });
        return ResponseEntity.accepted().body("Global Specialist Fix started for all flagged words.");
    }

    @GetMapping("/words/enriched")
    public ResponseEntity<org.springframework.data.domain.Page<com.sublex.model.Word>> getEnrichedWords(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "en") String language,
            @RequestParam(required = false) String date,
            @RequestParam(defaultValue = "false") boolean needsReEnrichment,
            @RequestParam(defaultValue = "false") boolean isVerified,
            @RequestParam(defaultValue = "false") boolean isJudgeApproved) {

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size,
                org.springframework.data.domain.Sort.by("id").descending());

        if (needsReEnrichment) {
            return ResponseEntity
                    .ok(wordRepository.findByLanguageAndIsEnrichedTrueAndNeedsReEnrichmentTrue(language, pageable));
        }
        if (isJudgeApproved) {
            if (date != null && !date.isEmpty()) {
                return ResponseEntity.ok(wordRepository
                        .findByLanguageAndJudgeApprovedAtPrecision(language, date, pageable));
            }
            return ResponseEntity
                    .ok(wordRepository.findByLanguageAndIsEnrichedTrueAndJudgeStatus(language, "APPROVED", pageable));
        }
        if (isVerified) {
            return ResponseEntity
                    .ok(wordRepository.findByLanguageAndIsEnrichedTrueAndIsVerifiedTrue(language, pageable));
        }
        if (date != null && !date.isEmpty()) {
            return ResponseEntity.ok(wordRepository.findByLanguageAndEnrichedAtPrecision(language, date, pageable));
        }
        return ResponseEntity.ok(wordRepository.findByLanguageAndIsEnrichedTrue(language, pageable));
    }

    @GetMapping("/words/enriched/approval-dates")
    public ResponseEntity<List<String>> getJudgeApprovedDates(@RequestParam(defaultValue = "en") String language) {
        return ResponseEntity.ok(wordRepository.findDistinctJudgeApprovedDates(language));
    }

    @GetMapping("/words/enriched/download")
    public ResponseEntity<List<com.sublex.model.Word>> downloadEnrichedWords(
            @RequestParam(defaultValue = "en") String language,
            @RequestParam(defaultValue = "false") String date,
            @RequestParam(defaultValue = "false") boolean needsReEnrichment,
            @RequestParam(defaultValue = "false") boolean isVerified,
            @RequestParam(defaultValue = "false") boolean isJudgeApproved) {

        List<com.sublex.model.Word> words;

        if (needsReEnrichment) {
            words = wordRepository.findByLanguageAndIsEnrichedTrueAndNeedsReEnrichmentTrue(language);
        } else if (isJudgeApproved) {
            if (date != null && !date.isEmpty() && !date.equals("false")) {
                words = wordRepository.findByLanguageAndJudgeApprovedAtPrecision(language, date);
            } else {
                words = wordRepository.findByLanguageAndIsEnrichedTrueAndJudgeStatus(language, "APPROVED");
            }
        } else if (isVerified) {
            words = wordRepository.findByLanguageAndIsEnrichedTrueAndIsVerifiedTrue(language);
        } else if (date != null && !date.isEmpty() && !date.equals("false")) {
            if (date.length() > 10) {
                words = wordRepository.findByLanguageAndEnrichedAtPrecision(language, date);
            } else {
                java.time.LocalDate localDate = java.time.LocalDate.parse(date);
                java.time.LocalDateTime start = localDate.atStartOfDay();
                java.time.LocalDateTime end = localDate.atTime(java.time.LocalTime.MAX);
                words = wordRepository.findByLanguageAndIsEnrichedTrueAndEnrichedAtBetween(language, start, end);
            }
        } else {
            words = wordRepository.findByLanguageAndIsEnrichedTrue(language);
        }

        String filename = "enriched_" + language + (needsReEnrichment ? "_flagged" : "")
                + (date != null ? "_" + date : "") + ".json";

        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + filename + "\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                .body(words);
    }

    @PostMapping("/approve-batch")
    @Operation(summary = "Marks a batch of words as Judge Approved")
    public ResponseEntity<String> approveBatch(@RequestBody List<Long> wordIds) {
        log.info("Request to judge-approve batch of {} words", wordIds.size());
        List<com.sublex.model.Word> words = wordRepository.findAllById(wordIds);
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        words.forEach(w -> {
            w.setJudgeStatus("APPROVED");
            w.setJudgeApprovedAt(now);
        });
        wordRepository.saveAll(words);
        return ResponseEntity.ok("Successfully judge-approved " + words.size() + " words.");
    }

    // ============ PIPELINE ENDPOINTS ============

    @PostMapping("/pipeline/start")
    @Operation(summary = "Starts the full 4-step enrichment pipeline")
    public ResponseEntity<String> startPipeline(@RequestParam(defaultValue = "100") int size) {
        log.info("Starting enrichment pipeline for {} words", size);
        pipelineService.startPipeline(size);
        return ResponseEntity.accepted().body("Pipeline started for " + size + " words.");
    }

    @PostMapping("/pipeline/trusted-enrichment")
    @Operation(summary = "Enriches words from trusted lists (Oxford) without changing difficulty")
    public ResponseEntity<String> startTrustedEnrichment(@RequestParam(defaultValue = "1000") int size) {
        log.info("Starting trusted enrichment for {} words", size);
        pipelineService.startTrustedEnrichment(size);
        return ResponseEntity.accepted().body("Trusted enrichment pipeline started for " + size + " words.");
    }

    @PostMapping("/media/{id}/pipeline/start")
    @Operation(summary = "Starts the full 4-step enrichment pipeline for a specific media")
    public ResponseEntity<String> startMediaPipeline(@PathVariable Long id,
            @RequestParam(defaultValue = "100") int size) {
        log.info("Starting enrichment pipeline for media ID: {} ({} words)", id, size);
        pipelineService.startPipeline(size, id);
        return ResponseEntity.accepted().body("Pipeline started for media " + id + ".");
    }

    @GetMapping("/pipeline/status")
    @Operation(summary = "Returns the current pipeline progress")
    public ResponseEntity<com.sublex.dto.PipelineStatus> getPipelineStatus() {
        return ResponseEntity.ok(pipelineService.getStatus());
    }

    @GetMapping("/pipeline/failures")
    @Operation(summary = "Returns list of failed words from pipeline run")
    public ResponseEntity<java.util.List<com.sublex.dto.PipelineStatus.FailedWord>> getPipelineFailures() {
        return ResponseEntity.ok(pipelineService.getStatus().getFailedWords());
    }

    @GetMapping("/words/judge-pending")
    @Operation(summary = "Returns words pending Judge review")
    public ResponseEntity<java.util.List<com.sublex.model.Word>> getJudgePendingWords() {
        return ResponseEntity.ok(wordRepository.findByJudgeStatus("PENDING_REVIEW"));
    }

    @PostMapping("/words/judge-approve")
    @Operation(summary = "Approves a Judge verdict for a word")
    public ResponseEntity<String> approveJudgeVerdict(@RequestParam Long wordId) {
        pipelineService.approveJudgeVerdict(wordId);
        return ResponseEntity.ok("Judge verdict approved for word ID: " + wordId);
    }

    @PostMapping("/words/judge-reject")
    @Operation(summary = "Rejects a Judge verdict for a word")
    public ResponseEntity<String> rejectJudgeVerdict(@RequestParam Long wordId) {
        pipelineService.rejectJudgeVerdict(wordId);
        return ResponseEntity.ok("Judge verdict rejected for word ID: " + wordId);
    }

    @PostMapping("/words/consolidate-roots")
    @Operation(summary = "One-time migration: Merges MediaWord counts for all root-linked words")
    @Transactional
    public ResponseEntity<String> consolidateRoots() {
        log.info("Starting legacy root consolidation...");
        // 1. Find all words that have a rootWord
        List<com.sublex.model.Word> inflectedWords = wordRepository.findAll().stream()
                .filter(w -> w.getRootWord() != null)
                .toList();

        int mergeCount = 0;
        for (com.sublex.model.Word infWord : inflectedWords) {
            com.sublex.model.Word root = infWord.getRootWord();
            List<com.sublex.model.MediaWord> associations = mediaWordRepository.findByWordId(infWord.getId());

            for (com.sublex.model.MediaWord infAssociation : associations) {
                java.util.Optional<com.sublex.model.MediaWord> rootAssociation = mediaWordRepository
                        .findByMediaIdAndWordId(infAssociation.getMedia().getId(), root.getId());

                if (rootAssociation.isPresent()) {
                    com.sublex.model.MediaWord rootMW = rootAssociation.get();
                    rootMW.setCount(rootMW.getCount() + infAssociation.getCount());
                    mediaWordRepository.save(rootMW);
                    mediaWordRepository.delete(infAssociation);
                } else {
                    infAssociation.setWord(root);
                    mediaWordRepository.save(infAssociation);
                }
                mergeCount++;
            }
        }

        return ResponseEntity.ok("Root consolidation completed. Merged " + mergeCount + " associations.");
    }
}
