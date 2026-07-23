package com.sublex.service;

import com.sublex.dto.MediaDTO;
import com.sublex.dto.MediaWordsResponseDTO;
import com.sublex.dto.WordDTO;
import com.sublex.model.Media;
import com.sublex.model.MediaWord;
import com.sublex.repository.MediaRepository;
import com.sublex.repository.MediaWordRepository;
import com.sublex.repository.UserKnownWordRepository;
import com.sublex.repository.WordListRepository;
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

    /** Number of words shown as a teaser when premium content is locked. */
    private static final int PREVIEW_LIMIT = 15;

    private final MediaRepository mediaRepository;
    private final MediaWordRepository mediaWordRepository;
    private final UserKnownWordRepository userKnownWordRepository;
    private final UserMediaProgressService userMediaProgressService;
    private final WordListRepository wordListRepository;
    private final MediaStatsCacheService mediaStatsCacheService;
    private final EntitlementService entitlementService;

    /**
     * Get recent media for user (Continue Learning)
     */
    public List<MediaDTO> getRecentMediaForUser(Long userId, int limit) {
        List<Media> recentMedia = userMediaProgressService.getRecentMediaForUser(userId, limit);
        if (recentMedia.isEmpty()) return new ArrayList<>();

        // Collect IDs for batch querying
        List<Long> mediaIds = recentMedia.stream().map(Media::getId).collect(Collectors.toList());

        // Batch 1: total word counts per media
        Map<Long, Integer> wordCounts = mediaStatsCacheService.getGlobalWordCounts();

        // Batch 2: level counts per media
        Map<Long, Map<String, Long>> levelCountsByMedia = mediaStatsCacheService.getGlobalLevelCounts();

        // Batch 3: known-word counts per media
        Map<Long, Integer> knownCountByMedia = new java.util.HashMap<>();
        Map<Long, Long> mediaToListMap = new java.util.HashMap<>();
        
        if (userId != null) {
            for (Object[] row : mediaWordRepository.countKnownWordsPerMedia(userId)) {
                Long mediaId = (Long) row[0];
                if (mediaIds.contains(mediaId)) {
                    Long knownCount = (Long) row[1];
                    knownCountByMedia.put(mediaId, knownCount.intValue());
                }
            }
            
            // Batch 4: WordList mappings
            for (Object[] row : wordListRepository.findMediaListMappingsByUserId(userId)) {
                Long mediaId = (Long) row[0];
                Long listId = (Long) row[1];
                mediaToListMap.put(mediaId, listId);
            }
        }

        List<MediaDTO> result = new ArrayList<>();
        for (Media media : recentMedia) {
            MediaDTO dto = convertToBasicDTO(media);
            int total = wordCounts.getOrDefault(media.getId(), 0);
            dto.setTotalWords(total);

            Map<String, Long> levelCounts = levelCountsByMedia.getOrDefault(
                    media.getId(), java.util.Collections.emptyMap());
            dto.setLevelCounts(levelCounts);

            levelCounts.entrySet().stream()
                    .max(java.util.Map.Entry.comparingByValue())
                    .map(java.util.Map.Entry::getKey)
                    .ifPresent(dto::setDifficultyLevel);

            dto.setOverallDifficulty(calculateOverallDifficulty(levelCounts, total));

            if (total > 0) {
                int known = knownCountByMedia.getOrDefault(media.getId(), 0);
                dto.setKnownWordPercentage((double) known / total * 100);
            }

            dto.setGeneratedListId(mediaToListMap.get(media.getId()));

            result.add(dto);
        }
        return result;
    }

    /**
     * Whole catalogue as a plain list — every movie and every episode, which is
     * what app-init's cold-start payload has always carried. Deliberately does
     * not go through the paginated query: that one collapses a series down to a
     * single representative episode, which would silently drop episodes here.
     */
    public List<MediaDTO> getAllMedia(Long userId) {
        java.util.function.Function<com.sublex.repository.MediaProjection, MediaDTO> enrich = mediaEnricher(userId);
        List<MediaDTO> result = new ArrayList<>();
        for (com.sublex.repository.MediaProjection media : mediaRepository.findAllProjectedBy()) {
            result.add(enrich.apply(media));
        }
        return result;
    }

    public org.springframework.data.domain.Page<MediaDTO> getAllMedia(Long userId, int page, int size, String search, String type) {
        if (type == null || type.isEmpty()) type = "ALL";

        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(
            page, size, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")
        );

        org.springframework.data.domain.Page<com.sublex.repository.MediaProjection> mediaPage =
            mediaRepository.searchAndFilterMedia(search, type, pageable);

        return mediaPage.map(mediaEnricher(userId));
    }

    /**
     * Builds the per-request lookup tables once, then returns a mapper that
     * turns a projection into a fully populated DTO. Shared by the list and
     * paginated variants so both enrich identically.
     */
    private java.util.function.Function<com.sublex.repository.MediaProjection, MediaDTO> mediaEnricher(Long userId) {
        // Batch 1: total word counts per media
        Map<Long, Integer> wordCounts = mediaStatsCacheService.getGlobalWordCounts();

        // Batch 2: level counts per media  →  Map<mediaId, Map<difficulty, count>>
        Map<Long, Map<String, Long>> levelCountsByMedia = mediaStatsCacheService.getGlobalLevelCounts();

        // Batch 3: known-word counts per media for this user
        Map<Long, Integer> knownCountByMedia = new java.util.HashMap<>();
        if (userId != null) {
            for (Object[] row : mediaWordRepository.countKnownWordsPerMedia(userId)) {
                Long mediaId    = (Long) row[0];
                Long knownCount = (Long) row[1];
                knownCountByMedia.put(mediaId, knownCount.intValue());
            }
        }

        return media -> {
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

            return dto;
        };
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

    public List<MediaDTO> getSeriesEpisodesByTmdbId(Long tmdbId) {
        return mediaRepository
                .findByTmdbIdAndTypeOrderBySeasonNumberAscEpisodeNumberAsc(tmdbId, MediaType.EPISODE)
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
                .filter(mw -> mw.getWord().getRootWord() == null)
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

        // Calculate level counts (computed on the FULL list so catalogue stats stay honest)
        java.util.Map<String, Long> levelCounts = words.stream()
                .filter(w -> w.getDifficulty() != null)
                .collect(Collectors.groupingBy(WordDTO::getDifficulty, Collectors.counting()));

        MediaDTO mediaDto = convertToDTO(media, userId);

        // Premium gating: withhold the word list for locked content, keep an honest teaser.
        boolean locked = media.isPremium() && !entitlementService.isPremium(userId);
        Integer lockedCount = null;
        if (locked) {
            lockedCount = Math.max(0, words.size() - PREVIEW_LIMIT);
            words = words.stream().limit(PREVIEW_LIMIT).collect(Collectors.toList());
            mediaDto.setLocked(true);
            mediaDto.setLockedCount(lockedCount);
        }

        MediaWordsResponseDTO response = new MediaWordsResponseDTO();
        response.setMedia(mediaDto);
        response.setWords(words);
        response.setTotalWords(totalWords);
        response.setUnknownWords(unknownWords);
        response.setLevelCounts(levelCounts);
        if (locked) {
            response.setLocked(true);
            response.setLockedCount(lockedCount);
            response.setPreviewLimit(PREVIEW_LIMIT);
        }

        return response;
    }

    /**
     * Whether the given user may access the full word list / subtitles for a media.
     * Free content is always accessible; premium content needs an active entitlement.
     */
    public boolean canAccessContent(Long mediaId, Long userId) {
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Media not found: " + mediaId));
        return !media.isPremium() || entitlementService.isPremium(userId);
    }

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
        dto.setIsPremium(media.isPremium());
        return dto;
    }

    private MediaDTO convertToBasicDTO(com.sublex.repository.MediaProjection media) {
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
        dto.setIsPremium(media.getIsPremium());
        return dto;
    }

    /**
     * Convert Media entity to DTO with personalized difficulty
     */
    private MediaDTO convertToDTO(Media media, Long userId) {
        List<MediaWord> mediaWords = mediaWordRepository.findByMediaId(media.getId()).stream()
                .filter(mw -> !Boolean.TRUE.equals(mw.getWord().getIsProperNoun()))
                .filter(mw -> mw.getWord().getRootWord() == null)
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
        dto.setIsPremium(media.isPremium());

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
        long counted = levelCounts.values().stream().mapToLong(Long::longValue).sum();
        if (counted == 0) return null;

        long bTotal = levelCounts.getOrDefault("B1", 0L) + levelCounts.getOrDefault("B2", 0L);
        long cTotal = levelCounts.getOrDefault("C1", 0L) + levelCounts.getOrDefault("C2", 0L);
        
        // Advanced words (B-level) and Mastery words (C-level, weighted by 2.0).
        // We calculate a percentage score out of all graded words.
        double weightedScore = ((double) (bTotal + (cTotal * 2)) / counted) * 100.0;

        // Based on DB distribution: Median is ~35.5, P25 is ~31.0, P75 is ~41.0
        if (weightedScore < 31.0) return "EASY";
        if (weightedScore <= 41.0) return "MEDIUM";
        return "HARD";
    }
}
