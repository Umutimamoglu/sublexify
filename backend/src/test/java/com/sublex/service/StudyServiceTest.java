package com.sublex.service;

import com.sublex.dto.StudyQuestionDTO;
import com.sublex.dto.StudyResultDTO;
import com.sublex.model.User;
import com.sublex.model.UserWordProgress;
import com.sublex.model.Word;
import com.sublex.model.WordDefinition;
import com.sublex.model.WordList;
import com.sublex.repository.UserRepository;
import com.sublex.repository.UserWordProgressRepository;
import com.sublex.repository.WordListRepository;
import com.sublex.repository.WordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class StudyServiceTest {

    @Mock
    private UserWordProgressRepository userWordProgressRepository;
    @Mock
    private WordListRepository wordListRepository;
    @Mock
    private WordRepository wordRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private StudyService studyService;

    private User testUser;
    private Word testWord;
    private WordList testWordList;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);

        testWord = new Word();
        testWord.setId(10L);
        testWord.setWord("apple");
        WordDefinition definition = new WordDefinition();
        WordDefinition.Meaning meaning = new WordDefinition.Meaning();
        meaning.setDefinition("A fruit");
        definition.setMeanings(Collections.singletonList(meaning));
        testWord.setDefinition(definition);

        testWordList = new WordList();
        testWordList.setId(100L);
        testWordList.setUser(testUser);
        testWordList.setWords(Set.of(testWord));
    }

    @Test
    void testGetNextBatch_Success() {
        when(wordListRepository.findById(100L)).thenReturn(Optional.of(testWordList));
        when(userWordProgressRepository.findByUserIdAndWordIdIn(1L, List.of(10L)))
                .thenReturn(Collections.emptyList()); // No previous progress (New word)

        List<StudyQuestionDTO> batch = studyService.getNextBatch(1L, 100L, 5, null);

        assertEquals(1, batch.size());
        StudyQuestionDTO question = batch.get(0);
        assertEquals("apple", question.getWord());
        assertEquals("A fruit", question.getDefinition());
        assertEquals("MULTIPLE_CHOICE", question.getQuestionType()); // successCount < 2
    }

    @Test
    void testGetNextBatch_Unauthorized() {
        User otherUser = new User();
        otherUser.setId(2L);
        testWordList.setUser(otherUser);

        when(wordListRepository.findById(100L)).thenReturn(Optional.of(testWordList));

        RuntimeException exception = assertThrows(RuntimeException.class, () ->
            studyService.getNextBatch(1L, 100L, 5, null)
        );
        assertEquals("Unauthorized", exception.getMessage());
    }

    @Test
    void testGetNextBatch_DeterminesQuestionTypes() {
        Word word2 = new Word();
        word2.setId(11L); word2.setWord("banana");
        
        Word word3 = new Word();
        word3.setId(12L); word3.setWord("cherry");

        testWordList.setWords(Set.of(testWord, word2, word3));
        when(wordListRepository.findById(100L)).thenReturn(Optional.of(testWordList));

        UserWordProgress prog1 = UserWordProgress.builder().word(testWord).successCount(1).build(); // MULTIPLE_CHOICE
        UserWordProgress prog2 = UserWordProgress.builder().word(word2).successCount(3).build(); // FILL_IN_THE_BLANKS
        UserWordProgress prog3 = UserWordProgress.builder().word(word3).successCount(6).build(); // LISTENING

        when(userWordProgressRepository.findByUserIdAndWordIdIn(1L, List.of(10L, 11L, 12L)))
                .thenReturn(Arrays.asList(prog1, prog2, prog3));

        List<StudyQuestionDTO> batch = studyService.getNextBatch(1L, 100L, 5, null);
        assertEquals(3, batch.size());

        for (StudyQuestionDTO q : batch) {
            if (q.getWord().equals("apple")) assertEquals("MULTIPLE_CHOICE", q.getQuestionType());
            if (q.getWord().equals("banana")) assertEquals("FILL_IN_THE_BLANKS", q.getQuestionType());
            if (q.getWord().equals("cherry")) assertEquals("LISTENING", q.getQuestionType());
        }
    }

    @Test
    void testProcessStudyResults_Correct() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(wordRepository.findById(10L)).thenReturn(Optional.of(testWord));

        UserWordProgress existingProgress = UserWordProgress.builder()
                .reviewCount(5)
                .successCount(2)
                .build();
        when(userWordProgressRepository.findByUserIdAndWordId(1L, 10L))
                .thenReturn(Optional.of(existingProgress));

        StudyResultDTO result = new StudyResultDTO(10L, true);

        studyService.processStudyResults(1L, Collections.singletonList(result));

        verify(userWordProgressRepository, times(1)).save(any(UserWordProgress.class));
        assertEquals(6, existingProgress.getReviewCount());
        assertEquals(3, existingProgress.getSuccessCount());
        // nextReviewDate should be set
        assertNotNull(existingProgress.getNextReviewDate());
        assertTrue(existingProgress.getNextReviewDate().isAfter(LocalDateTime.now().plusDays(5))); // successCount * 2 days delay
    }

    @Test
    void testProcessStudyResults_Incorrect() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(wordRepository.findById(10L)).thenReturn(Optional.of(testWord));

        UserWordProgress existingProgress = UserWordProgress.builder()
                .reviewCount(5)
                .successCount(2)
                .build();
        when(userWordProgressRepository.findByUserIdAndWordId(1L, 10L))
                .thenReturn(Optional.of(existingProgress));

        StudyResultDTO result = new StudyResultDTO(10L, false);

        studyService.processStudyResults(1L, Collections.singletonList(result));

        verify(userWordProgressRepository, times(1)).save(any(UserWordProgress.class));
        assertEquals(6, existingProgress.getReviewCount());
        assertEquals(2, existingProgress.getSuccessCount()); // Didn't increment
        // Reset to review tomorrow
        assertNotNull(existingProgress.getNextReviewDate());
        assertTrue(existingProgress.getNextReviewDate().isBefore(LocalDateTime.now().plusDays(1).plusHours(1)));
    }
}
