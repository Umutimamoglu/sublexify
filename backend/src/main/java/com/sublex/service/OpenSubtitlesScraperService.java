package com.sublex.service;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
@Slf4j
public class OpenSubtitlesScraperService {

    private static final String BASE_URL = "https://www.opensubtitles.org";
    private static final String SEARCH_URL_TEMPLATE = "https://www.opensubtitles.org/en/search/sublanguageid-eng/imdbid-%s";
    private static final String USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";

    public String scrape(String episodeImdbId) {
        log.info("Scraping OpenSubtitles for Episode IMDB ID: {}", episodeImdbId);

        try {
            // 1. Search for the Episode IMDB ID (strip 'tt' if present)
            String searchId = episodeImdbId.startsWith("tt") ? episodeImdbId.substring(2) : episodeImdbId;
            String searchUrl = String.format(SEARCH_URL_TEMPLATE, searchId);
            log.info("Fetching search URL: {}", searchUrl);

            Document searchPage = Jsoup.connect(searchUrl)
                    .userAgent(USER_AGENT)
                    .header("Accept-Language", "en-US,en;q=0.9")
                    .timeout(10000)
                    .get();

            // 2. Find the Subtitle Detail URL
            // Look for links like /en/subtitles/12345/series-name-episode-name
            Element subtitleLink = searchPage.selectFirst("a[href^='/en/subtitles/']");

            // If we are redirected directly to the detail page, searchPage might be the
            // detail page
            // But usually search results list multiple subtitles.
            // The user's logic picks the first one matching /en/subtitles/\d+/

            String subtitleDetailUrl;
            if (subtitleLink != null) {
                subtitleDetailUrl = BASE_URL + subtitleLink.attr("href");
            } else {
                // Check if we are already on the detail page (e.g. if there's only one result,
                // OS might redirect)
                if (searchPage.selectFirst("a#bt-dwl") != null) {
                    subtitleDetailUrl = searchPage.location();
                } else {
                    throw new RuntimeException("No subtitles found for IMDb ID: " + episodeImdbId);
                }
            }

            log.info("Found subtitle detail URL: {}", subtitleDetailUrl);

            // 3. Go to Subtitle Detail Page (if not already there)
            Document detailPage;
            if (subtitleDetailUrl.equals(searchPage.location())) {
                detailPage = searchPage;
            } else {
                detailPage = Jsoup.connect(subtitleDetailUrl)
                        .userAgent(USER_AGENT)
                        .get();
            }

            // 4. Find Download Button
            // User strategy: a#bt-dwl or
            // a[href^='https://dl.opensubtitles.org/en/download/sub/']
            Element downloadBtn = detailPage.selectFirst("a#bt-dwl");
            if (downloadBtn == null) {
                downloadBtn = detailPage.selectFirst("a[href^='https://dl.opensubtitles.org/en/download/sub/']");
            }

            if (downloadBtn == null) {
                throw new RuntimeException("Download button (bt-dwl) not found on page: " + subtitleDetailUrl);
            }

            String downloadLink = downloadBtn.attr("href");
            if (!downloadLink.startsWith("http")) {
                downloadLink = BASE_URL + downloadLink;
            }

            log.info("Found download URL: {}", downloadLink);

            // 5. Download and Extract ZIP
            return downloadAndExtract(downloadLink, subtitleDetailUrl);

        } catch (IOException e) {
            log.error("Error scraping OpenSubtitles", e);
            throw new RuntimeException("Scraping failed: " + e.getMessage());
        }
    }

    private String downloadAndExtract(String downloadUrl, String referrer) throws IOException {
        Connection.Response response = Jsoup.connect(downloadUrl)
                .userAgent(USER_AGENT)
                .referrer(referrer)
                .ignoreContentType(true)
                .maxBodySize(0)
                .execute();

        try (ZipInputStream zis = new ZipInputStream(response.bodyStream())) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                String name = entry.getName().toLowerCase();
                log.info("Checking zip entry: {}", name);

                if (name.endsWith(".srt") || name.endsWith(".ass")) {
                    log.info("Found subtitle file: {}", name);
                    return new String(readAllBytes(zis), StandardCharsets.UTF_8);
                }
            }
        }
        throw new RuntimeException("No .srt or .ass file found in ZIP");
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
