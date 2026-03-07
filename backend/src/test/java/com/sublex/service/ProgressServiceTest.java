package com.sublex.service;

import com.sublex.dto.ProgressStatsDTO;
import com.sublex.repository.UserWordProgressRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class ProgressServiceTest {

    @Mock
    private UserWordProgressRepository userWordProgressRepository;

    @InjectMocks
    private ProgressService progressService;

    private final Long userId = 1L;

    @Test
    void testGetStats_WithValidData() {
        when(userWordProgressRepository.countByUserId(userId)).thenReturn(100L);
        when(userWordProgressRepository.countHighRetentionWordsByUserId(userId)).thenReturn(40L);
        when(userWordProgressRepository.countWordsToReviewByUserId(userId)).thenReturn(15L);

        ProgressStatsDTO stats = progressService.getStats(userId);

        assertEquals(100L, stats.getTotalWordsStudied());
        assertEquals(40L, stats.getHighRetentionWords());
        assertEquals(15L, stats.getWordsToReviewToday());
    }

    @Test
    void testGetStats_WithNullData_ShouldReturnZeros() {
        when(userWordProgressRepository.countByUserId(userId)).thenReturn(null);
        when(userWordProgressRepository.countHighRetentionWordsByUserId(userId)).thenReturn(null);
        when(userWordProgressRepository.countWordsToReviewByUserId(userId)).thenReturn(null);

        ProgressStatsDTO stats = progressService.getStats(userId);

        assertEquals(0L, stats.getTotalWordsStudied());
        assertEquals(0L, stats.getHighRetentionWords());
        assertEquals(0L, stats.getWordsToReviewToday());
    }
}
