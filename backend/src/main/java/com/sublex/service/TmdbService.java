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
            ResponseEntity<String> response = restTemplate.exchange(
                    uriBuilder.toUriString(),
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class);

            if (response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                if (root.has("results")) {
                    JsonNode results = root.get("results");
                    if (results.isArray() && results.size() > 0) {
                        JsonNode firstMatch = results.get(0);
                        return Optional.of(mapToTmdbMedia(firstMatch, isSeries));
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error searching TMDB: {}", e.getMessage());
        }

        return Optional.empty();
    }

    public Optional<TmdbMedia> findMovieByImdbId(String imdbId) {
        String url = String.format("%s/find/%s?external_source=imdb_id", BASE_URL, imdbId);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(readToken);
        headers.set("accept", "application/json");

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class);

            if (response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode movieResults = root.path("movie_results");
                if (movieResults.isArray() && movieResults.size() > 0) {
                    JsonNode firstMatch = movieResults.get(0);
                    TmdbMedia media = mapToTmdbMedia(firstMatch, false);
                    media.setImdbId(imdbId); // Ensure IMDB ID is set
                    return Optional.of(media);
                }
            }
        } catch (Exception e) {
            log.error("Error finding movie by IMDB ID: {}", e.getMessage());
        }

        return Optional.empty();
    }

    public Optional<TmdbMedia> findShowByImdbId(String imdbId) {
        String url = String.format("%s/find/%s?external_source=imdb_id", BASE_URL, imdbId);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(readToken);
        headers.set("accept", "application/json");

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class);

            if (response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode tvResults = root.path("tv_results");
                if (tvResults.isArray() && tvResults.size() > 0) {
                    JsonNode firstMatch = tvResults.get(0);
                    TmdbMedia media = mapToTmdbMedia(firstMatch, true);
                    media.setImdbId(imdbId);
                    return Optional.of(media);
                }
            }
        } catch (Exception e) {
            log.error("Error finding show by IMDB ID: {}", e.getMessage());
        }

        return Optional.empty();
    }

    public Optional<TmdbEpisode> getEpisodeDetails(Long seriesId, int season, int episode) {
        String url = String.format("%s/tv/%d/season/%d/episode/%d?append_to_response=external_ids", BASE_URL, seriesId,
                season, episode);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(readToken);
        headers.set("accept", "application/json");

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class);

            if (response.getBody() != null) {
                JsonNode node = objectMapper.readTree(response.getBody());
                TmdbEpisode ep = new TmdbEpisode();
                ep.setId(node.get("id").asLong());
                ep.setName(node.path("name").asText());
                ep.setOverview(node.path("overview").asText());
                ep.setStillPath(node.path("still_path").asText(null));
                ep.setVoteAverage(node.path("vote_average").asDouble());
                ep.setAirDate(node.path("air_date").asText(null));

                // Extract External IDs (IMDB)
                if (node.has("external_ids")) {
                    ep.setImdbId(node.get("external_ids").path("imdb_id").asText(null));
                } else if (node.has("imdb_id")) {
                    ep.setImdbId(node.path("imdb_id").asText(null));
                }

                return Optional.of(ep);
            }
        } catch (Exception e) {
            log.error("Error fetching episode details: {}", e.getMessage());
        }
        return Optional.empty();
    }

    public Optional<TmdbMedia> getMediaDetails(Long tmdbId, boolean isSeries) {
        String endpoint = isSeries ? "/tv/" + tmdbId : "/movie/" + tmdbId;

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(readToken);
        headers.set("accept", "application/json");

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    BASE_URL + endpoint + "?append_to_response=external_ids",
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class);

            if (response.getBody() != null) {
                JsonNode node = objectMapper.readTree(response.getBody());
                return Optional.of(mapToTmdbMedia(node, isSeries));
            }
        } catch (Exception e) {
            log.error("Error fetching TMDB details: {}", e.getMessage());
        }

        return Optional.empty();
    }

    public List<TmdbMedia> searchSeries(String query) {
        UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString(BASE_URL + "/search/tv")
                .queryParam("query", query);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(readToken);
        headers.set("accept", "application/json");

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    uriBuilder.toUriString(),
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class);

            if (response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                if (root.has("results")) {
                    JsonNode results = root.get("results");
                    List<TmdbMedia> mediaList = new java.util.ArrayList<>();
                    if (results.isArray()) {
                        for (JsonNode node : results) {
                            mediaList.add(mapToTmdbMedia(node, true));
                        }
                    }
                    return mediaList;
                }
            }
        } catch (Exception e) {
            log.error("Error searching TMDB series: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    public Optional<TmdbSeasonDetails> getSeasonDetails(Long seriesId, int seasonNumber) {
        String url = String.format("%s/tv/%d/season/%d", BASE_URL, seriesId, seasonNumber);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(readToken);
        headers.set("accept", "application/json");

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class);

            if (response.getBody() != null) {
                JsonNode node = objectMapper.readTree(response.getBody());
                TmdbSeasonDetails season = new TmdbSeasonDetails();
                season.setId(node.get("id").asLong());
                season.setName(node.path("name").asText());
                season.setSeasonNumber(node.path("season_number").asInt());
                season.setOverview(node.path("overview").asText());
                season.setPosterPath(node.path("poster_path").asText(null));

                if (node.has("episodes")) {
                    List<TmdbEpisode> episodes = new java.util.ArrayList<>();
                    for (JsonNode epNode : node.get("episodes")) {
                        TmdbEpisode ep = new TmdbEpisode();
                        ep.setId(epNode.get("id").asLong());
                        ep.setName(epNode.path("name").asText());
                        ep.setEpisodeNumber(epNode.path("episode_number").asInt());
                        ep.setOverview(epNode.path("overview").asText());
                        ep.setStillPath(epNode.path("still_path").asText(null));
                        ep.setAirDate(epNode.path("air_date").asText(null));
                        ep.setVoteAverage(epNode.path("vote_average").asDouble());
                        episodes.add(ep);
                    }
                    season.setEpisodes(episodes);
                }

                return Optional.of(season);
            }
        } catch (Exception e) {
            log.error("Error fetching season details: {}", e.getMessage());
        }
        return Optional.empty();
    }

    // ... existing methods ...

    private TmdbMedia mapToTmdbMedia(JsonNode node, boolean isSeries) {
        TmdbMedia media = new TmdbMedia();
        media.setId(node.get("id").asLong());
        media.setTitle(node.path(isSeries ? "name" : "title").asText());
        media.setOverview(node.path("overview").asText());
        media.setPosterPath(node.path("poster_path").asText(null));
        media.setBackdropPath(node.path("backdrop_path").asText(null));
        media.setReleaseDate(node.path(isSeries ? "first_air_date" : "release_date").asText(null));
        media.setVoteAverage(node.path("vote_average").asDouble());

        // Extract External IDs (IMDB)
        if (node.has("external_ids")) {
            media.setImdbId(node.get("external_ids").path("imdb_id").asText(null));
        } else if (node.has("imdb_id")) {
            media.setImdbId(node.path("imdb_id").asText(null));
        }

        // Extract Seasons (for series details)
        if (isSeries && node.has("seasons")) {
            List<TmdbSeason> seasons = new java.util.ArrayList<>();
            for (JsonNode seasonNode : node.get("seasons")) {
                TmdbSeason s = new TmdbSeason();
                s.setId(seasonNode.get("id").asLong());
                s.setName(seasonNode.path("name").asText());
                s.setSeasonNumber(seasonNode.path("season_number").asInt());
                s.setEpisodeCount(seasonNode.path("episode_count").asInt());
                s.setPosterPath(seasonNode.path("poster_path").asText(null));
                s.setAirDate(seasonNode.path("air_date").asText(null));
                seasons.add(s);
            }
            media.setSeasons(seasons);
        }

        return media;
    }

    @Data
    public static class TmdbMedia {
        private Long id;
        private String imdbId;
        private String title;
        private String overview;
        private String posterPath;
        private String backdropPath;
        private String releaseDate;
        private Double voteAverage;
        private List<TmdbSeason> seasons;
    }

    @Data
    public static class TmdbSeason {
        private Long id;
        private String name;
        private int seasonNumber;
        private int episodeCount;
        private String posterPath;
        private String airDate;
    }

    @Data
    public static class TmdbSeasonDetails {
        private Long id;
        private String name;
        private int seasonNumber;
        private String overview;
        private String posterPath;
        private List<TmdbEpisode> episodes;
    }

    @Data
    public static class TmdbEpisode {
        private Long id;
        private String imdbId;
        private String name;
        private int episodeNumber;
        private String overview;
        private String stillPath; // Image for episode
        private String airDate;
        private Double voteAverage;
    }
}
