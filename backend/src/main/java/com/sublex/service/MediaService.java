package com.sublex.service;

import com.sublex.dto.MediaDTO;
import com.sublex.dto.MediaWordsResponseDTO;
import com.sublex.dto.WordDTO;
import com.sublex.model.Media;
import com.sublex.model.MediaWord;
import com.sublex.repository.MediaRepository;
import com.sublex.repository.MediaWordRepository;
import com.sublex.repository.UserKnownWordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import com.sublex.model.MediaType;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MediaService {

    private final MediaRepository mediaRepository;
    private final MediaWordRepository mediaWordRepository;
    private final UserKnownWordRepository userKnownWordRepository;
    private final UserMediaProgressService userMediaProgressService;

    /**
     * Get recent media for user (Continue Learning)
     */
    public List<MediaDTO> getRecentMediaForUser(Long userId, int limit) {
        return userMediaProgressService.getRecentMediaForUser(userId, limit).stream()
                .map(media -> convertToDTO(media, userId))
                .collect(Collectors.toList());
    }

    /**
     * Get all media — movies directly, episodes deduplicated by imdbId (one card per series)
     */
    public List<MediaDTO> getAllMedia(Long userId) {
        List<Media> all = mediaRepository.findAll();
        List<MediaDTO> result = new ArrayList<>();

        // Track which series (imdbId) we've already added
        Map<String, Boolean> seenSeries = new LinkedHashMap<>();

        for (Media media : all) {
            if (media.getType() == MediaType.MOVIE) {
                result.add(convertToBasicDTO(media));
            } else if (media.getType() == MediaType.EPISODE) {
                String imdbId = media.getImdbId();
                if (imdbId != null && !seenSeries.containsKey(imdbId)) {
                    seenSeries.put(imdbId, true);
                    MediaDTO dto = convertToBasicDTO(media);
                    // Extract show title: "Mr. Robot - Episode Name" → "Mr. Robot"
                    String rawTitle = media.getTitle();
                    int sep = rawTitle.indexOf(" - ");
                    dto.setTitle(sep > 0 ? rawTitle.substring(0, sep) : rawTitle);
                    // Clear episode-specific fields
                    dto.setSeasonNumber(null);
                    dto.setEpisodeNumber(null);
                    result.add(dto);
                }
            }
        }
        return result;
    }

    /**
     * Get all episodes for a series, sorted by season and episode number
     */
    public List<MediaDTO> getSeriesEpisodes(String imdbId) {
        return mediaRepository
                .findByImdbIdAndTypeOrderBySeasonNumberAscEpisodeNumberAsc(imdbId, MediaType.EPISODE)
                .stream()
                .map(this::convertToBasicDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get media by ID
     */
    public MediaDTO getMediaById(Long id, Long userId) {
        Media media = mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Media not found: " + id));
        return convertToDTO(media, userId);
    }

    /**
     * Get all words for a specific media
     * Optionally filter to show only unknown words for a user
     */
    public MediaWordsResponseDTO getMediaWords(Long mediaId, Long userId, Boolean onlyUnknown) {
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Media not found: " + mediaId));

        List<MediaWord> mediaWords = mediaWordRepository.findByMediaId(mediaId);

        // Get user's known words if userId provided
        Set<Long> knownWordIds = Set.of();
        if (userId != null) {
            knownWordIds = userKnownWordRepository.findByUserId(userId).stream()
                    .map(ukw -> ukw.getWord().getId())
                    .collect(Collectors.toSet());
        }

        // Convert to DTOs
        Set<Long> finalKnownWordIds = knownWordIds;
        List<WordDTO> words = mediaWords.stream()
                .map(mw -> convertToWordDTO(mw, finalKnownWordIds.contains(mw.getWord().getId())))
                .filter(wordDTO -> !onlyUnknown || !wordDTO.getIsKnown())
                .collect(Collectors.toList());

        // Calculate stats
        int totalWords = mediaWords.size();
        int unknownWords = userId != null
                ? (int) words.stream().filter(w -> !w.getIsKnown()).count()
                : 0;

        // Calculate level counts
        java.util.Map<String, Long> levelCounts = words.stream()
                .filter(w -> w.getDifficulty() != null)
                .collect(Collectors.groupingBy(WordDTO::getDifficulty, Collectors.counting()));

        MediaWordsResponseDTO response = new MediaWordsResponseDTO();
        response.setMedia(convertToDTO(media, userId));
        response.setWords(words);
        response.setTotalWords(totalWords);
        response.setUnknownWords(unknownWords);
        response.setLevelCounts(levelCounts);

        return response;
    }

    /**
     * Lightweight conversion — no extra DB queries, used for list endpoints
     */
    private MediaDTO convertToBasicDTO(Media media) {
        MediaDTO dto = new MediaDTO();
        dto.setId(media.getId());
        dto.setTitle(media.getTitle());
        dto.setImdbId(media.getImdbId());
        dto.setType(media.getType().toString());
        dto.setLanguage(media.getLanguage());
        dto.setOverview(media.getOverview());
        dto.setPosterUrl(media.getPosterUrl());
        dto.setBackdropUrl(media.getBackdropUrl());
        dto.setTmdbId(media.getTmdbId());
        dto.setSeasonNumber(media.getSeasonNumber());
        dto.setEpisodeNumber(media.getEpisodeNumber());
        dto.setVoteAverage(media.getVoteAverage());
        dto.setCreatedAt(media.getCreatedAt());
        return dto;
    }

    /**
     * Convert Media entity to DTO with personalized difficulty
     */
    private MediaDTO convertToDTO(Media media, Long userId) {
        int totalWords = mediaWordRepository.countByMediaId(media.getId());

        MediaDTO dto = new MediaDTO();
        dto.setId(media.getId());
        dto.setTitle(media.getTitle());
        dto.setImdbId(media.getImdbId());
        dto.setType(media.getType().toString());
        dto.setLanguage(media.getLanguage());
        dto.setTotalWords(totalWords);
        dto.setOverview(media.getOverview());
        dto.setPosterUrl(media.getPosterUrl());
        dto.setBackdropUrl(media.getBackdropUrl());
        dto.setTmdbId(media.getTmdbId());
        dto.setSeasonNumber(media.getSeasonNumber());
        dto.setEpisodeNumber(media.getEpisodeNumber());
        dto.setVoteAverage(media.getVoteAverage());
        dto.setCreatedAt(media.getCreatedAt());

        // Calculate level counts (A1, A2, B1, B2, C1, C2)
        List<MediaWord> mediaWords = mediaWordRepository.findByMediaId(media.getId());
        java.util.Map<String, Long> levelCounts = mediaWords.stream()
                .map(MediaWord::getWord)
                .filter(w -> w.getDifficulty() != null)
                .collect(Collectors.groupingBy(com.sublex.model.Word::getDifficulty, Collectors.counting()));
        dto.setLevelCounts(levelCounts);

        return dto;
    }

    /**
     * Convert MediaWord to WordDTO
     */
    private WordDTO convertToWordDTO(MediaWord mediaWord, boolean isKnown) {
        WordDTO dto = new WordDTO();
        dto.setId(mediaWord.getWord().getId());
        dto.setWord(mediaWord.getWord().getWord());
        dto.setLanguage(mediaWord.getWord().getLanguage());
        dto.setFrequency(mediaWord.getCount());
        dto.setIsKnown(isKnown);

        dto.setDefinition(mediaWord.getWord().getDefinition());
        dto.setDifficulty(mediaWord.getWord().getDifficulty());
        dto.setIsEnriched(mediaWord.getWord().getIsEnriched());

        return dto;
    }

    /**
     * Get subtitle content for a specific media
     */
    public String getSubtitleContent(Long id) {
        Media media = mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Media not found: " + id));
        return media.getSubtitleContent();
    }
}
