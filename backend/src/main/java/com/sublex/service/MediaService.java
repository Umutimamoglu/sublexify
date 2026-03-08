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
     * Get all media with level distribution and known-word percentage — 4 batch queries, no N+1
     */
    public List<MediaDTO> getAllMedia(Long userId) {
        List<Media> all = mediaRepository.findAll();

        // Batch 1: total word counts per media
        Map<Long, Integer> wordCounts = mediaWordRepository.countAllByMediaId()
                .stream()
                .collect(Collectors.toMap(
                        obj -> (Long) obj[0],
                        obj -> ((Long) obj[1]).intValue()
                ));

        // Batch 2: level counts per media  →  Map<mediaId, Map<difficulty, count>>
        Map<Long, Map<String, Long>> levelCountsByMedia = new java.util.HashMap<>();
        for (Object[] row : mediaWordRepository.findLevelCountsAllMedia()) {
            Long   mediaId = (Long)   row[0];
            String diff    = (String) row[1];
            Long   count   = (Long)   row[2];
            levelCountsByMedia.computeIfAbsent(mediaId, k -> new LinkedHashMap<>()).put(diff, count);
        }

        // Batch 3: known-word counts per media for this user
        Map<Long, Integer> knownCountByMedia = new java.util.HashMap<>();
        if (userId != null) {
            for (Object[] row : mediaWordRepository.countKnownWordsPerMedia(userId)) {
                Long mediaId    = (Long) row[0];
                Long knownCount = (Long) row[1];
                knownCountByMedia.put(mediaId, knownCount.intValue());
            }
        }

        List<MediaDTO> result = new ArrayList<>();
        for (Media media : all) {
            MediaDTO dto = convertToBasicDTO(media);
            int total    = wordCounts.getOrDefault(media.getId(), 0);
            dto.setTotalWords(total);

            // Level distribution
            Map<String, Long> levelCounts = levelCountsByMedia.getOrDefault(
                    media.getId(), java.util.Collections.emptyMap());
            dto.setLevelCounts(levelCounts);

            // Dominant difficulty level
            levelCounts.entrySet().stream()
                    .max(java.util.Map.Entry.comparingByValue())
                    .map(java.util.Map.Entry::getKey)
                    .ifPresent(dto::setDifficultyLevel);

            // Overall difficulty calculation
            dto.setOverallDifficulty(calculateOverallDifficulty(levelCounts, total));

            // Known-word percentage
            if (total > 0) {
                int known = knownCountByMedia.getOrDefault(media.getId(), 0);
                dto.setKnownWordPercentage((double) known / total * 100);
            }

            result.add(dto);
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
    public MediaWordsResponseDTO getMediaWords(Long mediaId, Long userId, Boolean onlyUnknown, String sortBy) {
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Media not found: " + mediaId));

        List<MediaWord> mediaWords = mediaWordRepository.findByMediaId(mediaId).stream()
                .filter(mw -> !Boolean.TRUE.equals(mw.getWord().getIsProperNoun()))
                .collect(Collectors.toList());

        // Get user's known words if userId provided
        Set<Long> knownWordIds = Set.of();
        if (userId != null) {
            knownWordIds = userKnownWordRepository.findByUserId(userId).stream()
                    .map(ukw -> ukw.getWord().getId())
                    .collect(Collectors.toSet());
        }

        // Convert and filter
        Set<Long> finalKnownWordIds = knownWordIds;
        List<WordDTO> words = mediaWords.stream()
                .map(mw -> convertToWordDTO(mw, finalKnownWordIds.contains(mw.getWord().getId())))
                .filter(wordDTO -> !onlyUnknown || !wordDTO.getIsKnown())
                .collect(Collectors.toList());

        // Sort if requested
        if ("frequency".equalsIgnoreCase(sortBy)) {
            words.sort((a, b) -> b.getFrequency().compareTo(a.getFrequency()));
        }

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
        List<MediaWord> mediaWords = mediaWordRepository.findByMediaId(media.getId()).stream()
                .filter(mw -> !Boolean.TRUE.equals(mw.getWord().getIsProperNoun()))
                .collect(Collectors.toList());
        int totalWords = mediaWords.size();

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
        java.util.Map<String, Long> levelCounts = mediaWords.stream()
                .map(MediaWord::getWord)
                .filter(w -> w.getDifficulty() != null)
                .collect(Collectors.groupingBy(com.sublex.model.Word::getDifficulty, Collectors.counting()));
        dto.setLevelCounts(levelCounts);

        // Dominant difficulty level
        levelCounts.entrySet().stream()
                .max(java.util.Map.Entry.comparingByValue())
                .map(java.util.Map.Entry::getKey)
                .ifPresent(dto::setDifficultyLevel);

        // Overall difficulty calculation
        dto.setOverallDifficulty(calculateOverallDifficulty(levelCounts, totalWords));

        // Known-word percentage
        if (userId != null && totalWords > 0) {
            Set<Long> knownWordIds = userKnownWordRepository.findByUserId(userId).stream()
                    .map(ukw -> ukw.getWord().getId())
                    .collect(Collectors.toSet());
            long knownCount = mediaWords.stream()
                    .filter(mw -> knownWordIds.contains(mw.getWord().getId()))
                    .count();
            dto.setKnownWordPercentage((double) knownCount / totalWords * 100);
        }

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
        dto.setIsProperNoun(mediaWord.getWord().getIsProperNoun());

        return dto;
    }

    /**
     * Get subtitle content for a specific media
     */
    /**
     * Get subtitle content for a specific media
     */
    public String getSubtitleContent(Long id) {
        Media media = mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Media not found: " + id));
        return media.getSubtitleContent();
    }

    /**
     * Calculate overall difficulty (EASY, MEDIUM, HARD) based on level distributions
     */
    private String calculateOverallDifficulty(Map<String, Long> levelCounts, int totalWords) {
        if (totalWords == 0) return "MEDIUM";

        long easyCount = levelCounts.getOrDefault("A1", 0L) + levelCounts.getOrDefault("A2", 0L);
        long hardCount = levelCounts.getOrDefault("C1", 0L) + levelCounts.getOrDefault("C2", 0L);

        double easyRatio = (double) easyCount / totalWords;
        double hardRatio = (double) hardCount / totalWords;

        if (easyRatio > 0.85) { // If more than 85% of distinct words are A1/A2
            return "EASY";
        } else if (hardRatio > 0.05) { // If more than 5% of distinct words are C1/C2
            return "HARD";
        } else {
            return "MEDIUM";
        }
    }
}
