package com.sublex.service;

import com.sublex.dto.MediaDTO;
import com.sublex.dto.MediaWordsResponseDTO;
import com.sublex.dto.WordDTO;
import com.sublex.model.Media;
import com.sublex.model.MediaWord;
import com.sublex.model.UserKnownWord;
import com.sublex.repository.MediaRepository;
import com.sublex.repository.MediaWordRepository;
import com.sublex.repository.UserKnownWordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
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
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all media with total word counts
     */
    public List<MediaDTO> getAllMedia() {
        return mediaRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get media by ID
     */
    public MediaDTO getMediaById(Long id) {
        Media media = mediaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Media not found: " + id));
        return convertToDTO(media);
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
        response.setMedia(convertToDTO(media));
        response.setWords(words);
        response.setTotalWords(totalWords);
        response.setUnknownWords(unknownWords);
        response.setLevelCounts(levelCounts);

        return response;
    }

    /**
     * Convert Media entity to DTO
     */
    private MediaDTO convertToDTO(Media media) {
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
