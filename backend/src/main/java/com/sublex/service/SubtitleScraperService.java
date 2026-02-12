package com.sublex.service;

import com.sublex.model.Media;
import com.sublex.model.MediaType;
import com.sublex.repository.MediaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubtitleScraperService {

    private final MediaRepository mediaRepository;
    private final TmdbService tmdbService;
    private final SubtitleProcessingService subtitleProcessingService;
    private final OpenSubtitlesScraperService openSubtitlesScraperService;

    private static final String YTS_BASE_URL = "https://yifysubtitles.ch";

    @Transactional
    public void scrapeEpisode(String seriesImdbId, Integer season, Integer episode) {
        log.info("Starting episode scrape for Series IMDB ID: {}, S{}E{}", seriesImdbId, season, episode);

        // 1. Fetch Episode Details first (we need Episode IMDb ID for scraper, and
        // Series IMDb ID for DB)
        TmdbService.TmdbMedia show = tmdbService.findShowByImdbId(seriesImdbId)
                .orElseThrow(
                        () -> new RuntimeException("Show not found in TMDB with IMDB ID: " + seriesImdbId));

        TmdbService.TmdbEpisode epDetails = tmdbService.getEpisodeDetails(show.getId(), season, episode)
                .orElseThrow(() -> new RuntimeException(
                        "Episode not found in TMDB: S" + season + "E" + episode));

        String episodeImdbId = epDetails.getImdbId();
        if (episodeImdbId == null) {
            throw new RuntimeException("No IMDB ID found for episode S" + season + "E" + episode);
        }

        // 2. Find or Create Media (Episode) using SERIES IMDB ID
        Media media = findOrCreateEpisodeMedia(seriesImdbId, season, episode, show, epDetails);

        try {
            // 3. Scrape OpenSubtitles using EPISODE IMDB ID
            String subtitleContent = openSubtitlesScraperService.scrape(episodeImdbId);

            // 4. Process subtitle
            subtitleProcessingService.processSubtitles(media.getId(), subtitleContent, "en");

            log.info("Successfully scraped and processed subtitles for: {}", media.getTitle());

        } catch (Exception e) {
            log.error("Failed to scrape subtitles for {} S{}E{}: {}", seriesImdbId, season, episode, e.getMessage());
            throw new RuntimeException("Scraping failed: " + e.getMessage());
        }
    }

    private Media findOrCreateEpisodeMedia(String seriesImdbId, Integer season, Integer episode,
            TmdbService.TmdbMedia show, TmdbService.TmdbEpisode epDetails) {
        return mediaRepository.findByImdbIdAndSeasonNumberAndEpisodeNumber(seriesImdbId, season, episode)
                .orElseGet(() -> {
                    log.info("Episode not found in DB, creating new Media: {} S{}E{}", seriesImdbId, season, episode);

                    Media newMedia = new Media();
                    newMedia.setTitle(show.getTitle() + " - " + epDetails.getName());
                    newMedia.setImdbId(seriesImdbId); // Use SERIES IMDB ID
                    newMedia.setTmdbId(show.getId()); // Use SERIES TMDB ID for grouping
                    newMedia.setOverview(epDetails.getOverview());
                    newMedia.setPosterUrl("https://image.tmdb.org/t/p/w500" + epDetails.getStillPath());
                    newMedia.setBackdropUrl("https://image.tmdb.org/t/p/original" + show.getBackdropPath());
                    newMedia.setVoteAverage(epDetails.getVoteAverage());
                    newMedia.setReleaseDate(String.valueOf(epDetails.getAirDate()));
                    newMedia.setType(MediaType.EPISODE);
                    newMedia.setSeasonNumber(season);
                    newMedia.setEpisodeNumber(episode);
                    newMedia.setLanguage("en");

                    return mediaRepository.save(newMedia);
                });
    }

    @Transactional
    public void scrapeAndProcess(String imdbId) {
        log.info("Starting scrape process for IMDB ID: {}", imdbId);

        // 1. Find or Create Media
        Media media = findOrCreateMedia(imdbId);

        try {
            // 2. Scrape YTS for English subtitle
            String subtitleContent = fetchSubtitleContent(imdbId);

            // 3. Process subtitle
            subtitleProcessingService.processSubtitles(media.getId(), subtitleContent, "en");

            log.info("Successfully scraped and processed subtitles for: {}", media.getTitle());

        } catch (Exception e) {
            log.error("Failed to scrape subtitles for {}: {}", imdbId, e.getMessage());
            throw new RuntimeException("Scraping failed: " + e.getMessage());
        }
    }

    private Media findOrCreateMedia(String imdbId) {
        return mediaRepository.findByImdbId(imdbId)
                .orElseGet(() -> {
                    log.info("Media not found in DB, fetching from TMDB: {}", imdbId);
                    TmdbService.TmdbMedia tmdbMedia = tmdbService.findMovieByImdbId(imdbId)
                            .orElseThrow(() -> new RuntimeException("Movie not found in TMDB with IMDB ID: " + imdbId));

                    Media newMedia = new Media();
                    newMedia.setTitle(tmdbMedia.getTitle());
                    newMedia.setImdbId(imdbId);
                    newMedia.setTmdbId(tmdbMedia.getId());
                    newMedia.setOverview(tmdbMedia.getOverview());
                    newMedia.setPosterUrl("https://image.tmdb.org/t/p/w500" + tmdbMedia.getPosterPath());
                    newMedia.setBackdropUrl("https://image.tmdb.org/t/p/original" + tmdbMedia.getBackdropPath());
                    newMedia.setVoteAverage(tmdbMedia.getVoteAverage());
                    newMedia.setReleaseDate(String.valueOf(tmdbMedia.getReleaseDate()));
                    newMedia.setType(MediaType.MOVIE);
                    newMedia.setLanguage("en");

                    return mediaRepository.save(newMedia);
                });
    }

    private String fetchSubtitleContent(String imdbId) throws IOException {
        String movieUrl = YTS_BASE_URL + "/movie-imdb/" + imdbId;

        // Use a session to persist cookies and headers across requests
        org.jsoup.Connection session = Jsoup.newSession()
                .userAgent(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
                .header("Accept-Language", "en-US,en;q=0.9")
                .header("Accept",
                        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8");

        // 1. Movie Page
        log.info("Fetching movie page: {}", movieUrl);
        Document moviePage = session.url(movieUrl).get();

        // 2. Find English Subtitle Link
        String subtitleDetailUrl = null;
        Elements rows = moviePage.select("tr");
        for (Element row : rows) {
            String lang = row.select("td:nth-child(2)").text().trim().toLowerCase();
            if ("english".equals(lang)) {
                String href = row.select("a").attr("href");
                if (href.startsWith("/subtitles/")) {
                    subtitleDetailUrl = YTS_BASE_URL + href;
                    break; // Pick the first english subtitle
                }
            }
        }

        if (subtitleDetailUrl == null) {
            throw new RuntimeException("No English subtitle found on YTS for " + imdbId);
        }

        // 3. Subtitle Detail Page
        log.info("Fetching subtitle detail page: {}", subtitleDetailUrl);
        Document subtitlePage = session.newRequest().url(subtitleDetailUrl).get();
        String zipLink = subtitlePage.select("a[href$='.zip']").attr("href");

        if (zipLink == null || zipLink.isEmpty()) {
            throw new RuntimeException("ZIP download link not found");
        }

        // 4. Download ZIP
        String downloadUrl = zipLink.startsWith("http") ? zipLink : YTS_BASE_URL + zipLink;
        log.info("Downloading ZIP from: {}", downloadUrl);

        try (InputStream in = session.newRequest()
                .url(downloadUrl)
                .ignoreContentType(true)
                .referrer(subtitleDetailUrl)
                .maxBodySize(0)
                .execute()
                .bodyStream();
                ZipInputStream zis = new ZipInputStream(in)) {

            // 5. Extract SRT
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String name = entry.getName().toLowerCase();
                if (name.endsWith(".srt") || name.endsWith(".ass")) {
                    log.info("Found subtitle in ZIP: {}", entry.getName());
                    return new String(readAllBytes(zis), StandardCharsets.UTF_8);
                }
            }
        }

        throw new RuntimeException("SRT file not found in ZIP");
    }

    private byte[] readAllBytes(InputStream inputStream) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        int nRead;
        byte[] data = new byte[1024];
        while ((nRead = inputStream.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        buffer.flush();
        return buffer.toByteArray();
    }
}
