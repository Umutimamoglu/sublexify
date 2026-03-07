package com.sublex.service;

import com.sublex.dto.MediaDTO;
import com.sublex.model.Media;
import com.sublex.model.MediaType;
import com.sublex.repository.MediaRepository;
import com.sublex.repository.MediaWordRepository;
import com.sublex.repository.UserKnownWordRepository;
import com.sublex.repository.WordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class MediaServiceTest {

    @Mock
    private MediaRepository mediaRepository;

    @Mock
    private MediaWordRepository mediaWordRepository;

    @Mock
    private UserKnownWordRepository userKnownWordRepository;

    @Mock
    private WordRepository wordRepository;

    @InjectMocks
    private MediaService mediaService;

    private Media testMedia;

    @BeforeEach
    void setUp() {
        testMedia = new Media();
        testMedia.setId(1L);
        testMedia.setTitle("Test Movie");
        testMedia.setType(MediaType.MOVIE);
    }

    @Test
    void testGetMediaOverview_NoKnownWords() {
        // Arrange
        Long userId = 1L;
        when(mediaRepository.findAll()).thenReturn(Arrays.asList(testMedia));
        
        // Mock 100 total words for the media
        when(mediaWordRepository.countAllByMediaId())
                .thenReturn(Collections.singletonList(new Object[]{1L, 100L}));
        
        // Mock 0 known words for the user
        when(mediaWordRepository.countKnownWordsPerMedia(userId))
                .thenReturn(Collections.emptyList());

        when(mediaWordRepository.findLevelCountsAllMedia())
                .thenReturn(Collections.emptyList());

        // Act
        List<MediaDTO> result = mediaService.getAllMedia(userId);

        // Assert
        assertEquals(1, result.size());
        assertEquals(100, result.get(0).getTotalWords());
        assertEquals(0.0, result.get(0).getKnownWordPercentage(), 0.01);
    }

    @Test
    void testGetMediaOverview_HalfKnownWords() {
        // Arrange
        Long userId = 1L;
        when(mediaRepository.findAll()).thenReturn(Arrays.asList(testMedia));
        
        // Mock 100 total words for the media
        when(mediaWordRepository.countAllByMediaId())
                .thenReturn(Collections.singletonList(new Object[]{1L, 100L}));
        
        // Mock 50 known words for the user
        when(mediaWordRepository.countKnownWordsPerMedia(userId))
                .thenReturn(Collections.singletonList(new Object[]{1L, 50L}));

        when(mediaWordRepository.findLevelCountsAllMedia())
                .thenReturn(Collections.emptyList());

        // Act
        List<MediaDTO> result = mediaService.getAllMedia(userId);

        // Assert
        assertEquals(1, result.size());
        assertEquals(100, result.get(0).getTotalWords());
        assertEquals(50.0, result.get(0).getKnownWordPercentage(), 0.01);
    }

    @Test
    void testGetMediaOverview_AllKnownWords() {
        // Arrange
        Long userId = 1L;
        when(mediaRepository.findAll()).thenReturn(Arrays.asList(testMedia));
        
        // Mock 100 total words for the media
        when(mediaWordRepository.countAllByMediaId())
                .thenReturn(Collections.singletonList(new Object[]{1L, 100L}));
        
        // Mock 100 known words for the user
        when(mediaWordRepository.countKnownWordsPerMedia(userId))
                .thenReturn(Collections.singletonList(new Object[]{1L, 100L}));

        when(mediaWordRepository.findLevelCountsAllMedia())
                .thenReturn(Collections.emptyList());

        // Act
        List<MediaDTO> result = mediaService.getAllMedia(userId);

        // Assert
        assertEquals(1, result.size());
        assertEquals(100, result.get(0).getTotalWords());
        assertEquals(100.0, result.get(0).getKnownWordPercentage(), 0.01);
    }

    @Test
    void testCalculateOverallDifficulty_Easy() {
        Long userId = 1L;
        when(mediaRepository.findAll()).thenReturn(Arrays.asList(testMedia));
        
        when(mediaWordRepository.countAllByMediaId())
                .thenReturn(Collections.singletonList(new Object[]{1L, 100L})); // Total 100 words
                
        // 86 easy words out of 100 (> 85%) -> EASY
        when(mediaWordRepository.findLevelCountsAllMedia())
                .thenReturn(Arrays.asList(
                    new Object[]{1L, "A1", 40L},
                    new Object[]{1L, "A2", 46L}
                ));

        List<MediaDTO> result = mediaService.getAllMedia(userId);

        assertEquals(1, result.size());
        assertEquals("EASY", result.get(0).getOverallDifficulty());
    }

    @Test
    void testCalculateOverallDifficulty_Hard() {
        Long userId = 1L;
        when(mediaRepository.findAll()).thenReturn(Arrays.asList(testMedia));
        
        when(mediaWordRepository.countAllByMediaId())
                .thenReturn(Collections.singletonList(new Object[]{1L, 100L})); // Total 100 words
                
        // 6 hard words out of 100 (> 5%) -> HARD
        when(mediaWordRepository.findLevelCountsAllMedia())
                .thenReturn(Arrays.asList(
                    new Object[]{1L, "C1", 4L},
                    new Object[]{1L, "C2", 2L}
                ));

        List<MediaDTO> result = mediaService.getAllMedia(userId);

        assertEquals(1, result.size());
        assertEquals("HARD", result.get(0).getOverallDifficulty());
    }

    @Test
    void testCalculateOverallDifficulty_Medium() {
        Long userId = 1L;
        when(mediaRepository.findAll()).thenReturn(Arrays.asList(testMedia));
        
        when(mediaWordRepository.countAllByMediaId())
                .thenReturn(Collections.singletonList(new Object[]{1L, 100L})); // Total 100 words
                
        // 50 easy words (<= 85%), 4 hard words (<= 5%) -> MEDIUM
        when(mediaWordRepository.findLevelCountsAllMedia())
                .thenReturn(Arrays.asList(
                    new Object[]{1L, "A1", 20L},
                    new Object[]{1L, "A2", 30L},
                    new Object[]{1L, "B1", 46L},
                    new Object[]{1L, "C1", 4L}
                ));

        List<MediaDTO> result = mediaService.getAllMedia(userId);

        assertEquals(1, result.size());
        assertEquals("MEDIUM", result.get(0).getOverallDifficulty());
    }
}
