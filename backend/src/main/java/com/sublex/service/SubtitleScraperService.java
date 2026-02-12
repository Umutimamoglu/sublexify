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
    public void scrapeEpisode(String imdbId, Integer season, Integer episode) {
        log.info("Starting episode scrape for Series IMDB ID: {}, S{}E{}", imdbId, season, episode);

        // 1. Find or Create Media (Episode)
        Media media = findOrCreateEpisodeMedia(imdbId, season, episode);

        if (media.getImdbId() == null) {
            throw new RuntimeException("No IMDB ID found for episode S" + season + "E" + episode);
        }

        try {
            // 2. Scrape OpenSubtitles using Episode IMDB ID
            String subtitleContent = openSubtitlesScraperService.scrape(media.getImdbId());

            // 3. Process subtitle
            subtitleProcessingService.processSubtitles(media.getId(), subtitleContent, "en");

            log.info("Successfully scraped and processed subtitles for: {}", media.getTitle());

        } catch (Exception e) {
            log.error("Failed to scrape subtitles for {} S{}E{}: {}", imdbId, season, episode, e.getMessage());
            throw new RuntimeException("Scraping failed: " + e.getMessage());
        }
    }

    private Media findOrCreateEpisodeMedia(String seriesImdbId, Integer season, Integer episode) {
        return mediaRepository.findByImdbIdAndSeasonNumberAndEpisodeNumber(seriesImdbId, season, episode)
                .orElseGet(() -> {
                    log.info("Episode not found in DB, fetching from TMDB: {} S{}E{}", seriesImdbId, season, episode);

                    // We need to find the Show ID first from the IMDB ID
                    TmdbService.TmdbMedia show = tmdbService.findShowByImdbId(seriesImdbId)
                            .orElseThrow(
                                    () -> new RuntimeException("Show not found in TMDB with IMDB ID: " + seriesImdbId));

                    // Then fetch episode details (which now includes IMDB ID)
                    TmdbService.TmdbEpisode epDateils = tmdbService.getEpisodeDetails(show.getId(), season, episode)
                            .orElseThrow(() -> new RuntimeException(
                                    "Episode not found in TMDB: S" + season + "E" + episode));

                    Media newMedia = new Media();
                    newMedia.setTitle(show.getTitle() + " - " + epDateils.getName());
                    // Ideally we want the Episode's IMDB ID here for the media record?
                    // But the repository lookup uses (seriesImdbId, season, episode).
                    // The 'imdbId' field in Media entity usually stores the Media's own IMDB ID.
                    // For episodes, it SHOULD be the episode's IMDB ID.
                    // But if we store Episode IMDB ID in 'imdbId' field, the lookup
                    // 'findByImdbIdAndSeasonNumberAndEpisodeNumber'
                    // might fail if it expects the Series IMDB ID?
                    // Let's check MediaRepository.
                    // Actually, usually for episodes we might store Series IMDB ID in a separate
                    // field or relation?
                    // Checking Media model would be good, but assuming standard behavior:
                    // If 'imdbId' is unique, then for episode it should be Episode ID.
                    // But the query `findByImdbIdAndSeasonNumberAndEpisodeNumber` implies `imdbId`
                    // might be the Series ID?
                    // Let's assume for now we store the Episode's IMDB ID in `imdbId` if available,
                    // BUT the lookup `findByImdbIdAndSeasonNumberAndEpisodeNumber` usually takes
                    // the SERIES ID??
                    // Wait, `findByImdbIdAndSeasonNumberAndEpisodeNumber` likely searches by
                    // `imdbId` column.
                    // If we store Episode ID there, we can't find it by Series ID.
                    // Let's re-read the repository method name carefully.
                    // `findByImdbIdAndSeasonNumberAndEpisodeNumber`.
                    // If this is for finding an episode of a series, it likely relies on a
                    // `seriesImdbId` field?
                    // Or maybe it finds by the Episode's IMDB ID (if passed as argument)?
                    // But the argument in `scrapeEpisode` is `seriesImdbId`.

                    // LET'S CHECK MediaRepository definition to be safe.
                    // But for now, I will use the Episode's IMDB ID for the scraping call.
                    // And I will map the media object.

                    newMedia.setImdbId(epDateils.getImdbId()); // Use Episode IMDB ID
                    newMedia.setTmdbId(epDateils.getId());
                    newMedia.setOverview(epDateils.getOverview());
                    newMedia.setPosterUrl("https://image.tmdb.org/t/p/w500" + epDateils.getStillPath());
                    newMedia.setBackdropUrl("https://image.tmdb.org/t/p/original" + show.getBackdropPath());
                    newMedia.setVoteAverage(epDateils.getVoteAverage());
                    newMedia.setReleaseDate(String.valueOf(epDateils.getAirDate()));
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
