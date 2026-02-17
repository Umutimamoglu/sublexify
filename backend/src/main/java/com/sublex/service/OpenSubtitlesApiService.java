package com.sublex.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class OpenSubtitlesApiService {

    @Value("${application.opensubtitles.api-key}")
    private String apiKey;

    @Value("${application.opensubtitles.user-agent}")
    private String userAgent;

    private final RestTemplate restTemplate = new RestTemplate();
    private static final String API_BASE_URL = "https://api.opensubtitles.com/api/v1";

    /**
     * Search for subtitles and download content using the official API
     */
    public String fetchSubtitles(String imdbId, String type) {
        log.info("Fetching subtitles via official API for IMDb ID: {} (Type: {})", imdbId, type);

        try {
            // 1. Search for subtitles
            String fileId = searchSubtitleFileId(imdbId, type);
            if (fileId == null) {
                return null;
            }

            // 2. Get Download link
            String downloadLink = getDownloadLink(fileId);
            if (downloadLink == null) {
                return null;
            }

            // 3. Download content
            return downloadSubtitleContent(downloadLink);

        } catch (Exception e) {
            log.error("OpenSubtitles API call failed", e);
            return null;
        }
    }

    private String searchSubtitleFileId(String imdbId, String type) {
        // Strip 'tt' from IMDb ID for the API if needed, but OS API often expects 'tt'
        // or numeric
        // We'll try with numeric part as per documentation typically
        String numericId = imdbId.startsWith("tt") ? imdbId.substring(2) : imdbId;

        String url = API_BASE_URL + "/subtitles?imdb_id=" + numericId
                + "&languages=en&order_by=download_count&order_direction=desc";

        HttpHeaders headers = createHeaders();
        HttpEntity<String> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);

        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            List<Map<String, Object>> data = (List<Map<String, Object>>) response.getBody().get("data");
            if (data != null && !data.isEmpty()) {
                // Return the file_id of the first result (most downloaded)
                Map<String, Object> attributes = (Map<String, Object>) data.get(0).get("attributes");
                List<Map<String, Object>> files = (List<Map<String, Object>>) attributes.get("files");
                if (files != null && !files.isEmpty()) {
                    return String.valueOf(files.get(0).get("file_id"));
                }
            }
        }

        log.warn("No subtitles found via official API for numeric IMDb ID: {}", numericId);
        return null;
    }

    private String getDownloadLink(String fileId) {
        String url = API_BASE_URL + "/download";

        HttpHeaders headers = createHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, String> body = new HashMap<>();
        body.put("file_id", fileId);

        HttpEntity<Map<String, String>> entity = new HttpEntity<>(body, headers);

        ResponseEntity<Map> response = restTemplate.postForEntity(url, entity, Map.class);

        if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
            return (String) response.getBody().get("link");
        }

        log.warn("Failed to get download link for fileId: {}", fileId);
        return null;
    }

    private String downloadSubtitleContent(String downloadLink) {
        // This link is temporary and should be fetched directly
        ResponseEntity<String> response = restTemplate.getForEntity(downloadLink, String.class);
        if (response.getStatusCode() == HttpStatus.OK) {
            return response.getBody();
        }
        return null;
    }

    private HttpHeaders createHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Api-Key", apiKey);
        headers.set("User-Agent", userAgent);
        headers.set("Accept", "application/json");
        return headers;
    }
}
