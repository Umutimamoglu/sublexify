package com.sublex.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Service
@Slf4j
@RequiredArgsConstructor
public class TmdbService {

    @Value("${TMDB_READ_TOKEN}")
    private String readToken;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final String BASE_URL = "https://api.themoviedb.org/3";

    public Optional<TmdbMedia> searchAndMatch(String title, Integer year, boolean isSeries) {
        String endpoint = isSeries ? "/search/tv" : "/search/movie";

        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString(BASE_URL + endpoint)
                .queryParam("query", title);

        if (year != null) {
            uriBuilder.queryParam(isSeries ? "first_air_date_year" : "year", year);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(readToken);
        headers.set("accept", "application/json");

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    uriBuilder.toUriString(),
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    JsonNode.class);

            if (response.getBody() != null && response.getBody().has("results")) {
                JsonNode results = response.getBody().get("results");
                if (results.isArray() && results.size() > 0) {
                    JsonNode firstMatch = results.get(0);
                    return Optional.of(mapToTmdbMedia(firstMatch, isSeries));
                }
            }
        } catch (Exception e) {
            log.error("Error searching TMDB: {}", e.getMessage());
        }

        return Optional.empty();
    }

    public Optional<TmdbEpisode> getEpisodeDetails(Long seriesId, int season, int episode) {
        String url = String.format("%s/tv/%d/season/%d/episode/%d", BASE_URL, seriesId, season, episode);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(readToken);
        headers.set("accept", "application/json");

        try {
            ResponseEntity<JsonNode> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    JsonNode.class);

            if (response.getBody() != null) {
                JsonNode node = response.getBody();
                TmdbEpisode ep = new TmdbEpisode();
                ep.setName(node.path("name").asText());
                ep.setOverview(node.path("overview").asText());
                ep.setStillPath(node.path("still_path").asText(null));
                ep.setVoteAverage(node.path("vote_average").asDouble());
                return Optional.of(ep);
            }
        } catch (Exception e) {
            log.error("Error fetching episode details: {}", e.getMessage());
        }
        return Optional.empty();
    }

    private TmdbMedia mapToTmdbMedia(JsonNode node, boolean isSeries) {
        TmdbMedia media = new TmdbMedia();
        media.setId(node.get("id").asLong());
        media.setTitle(node.path(isSeries ? "name" : "title").asText());
        media.setOverview(node.path("overview").asText());
        media.setPosterPath(node.path("poster_path").asText(null));
        media.setBackdropPath(node.path("backdrop_path").asText(null));
        media.setReleaseDate(node.path(isSeries ? "first_air_date" : "release_date").asText(null));
        media.setVoteAverage(node.path("vote_average").asDouble());
        return media;
    }

    @Data
    public static class TmdbMedia {
        private Long id;
        private String title;
        private String overview;
        private String posterPath;
        private String backdropPath;
        private String releaseDate;
        private Double voteAverage;
    }

    @Data
    public static class TmdbEpisode {
        private String name;
        private String overview;
        private String stillPath; // Image for episode
        private Double voteAverage;
    }
}
