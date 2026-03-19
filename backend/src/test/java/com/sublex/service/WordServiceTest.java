package com.sublex.service;

import com.sublex.dto.WordDTO;
import com.sublex.model.UserKnownWord;
import com.sublex.model.Word;
import com.sublex.repository.UserKnownWordRepository;
import com.sublex.repository.WordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class WordServiceTest {

    @Mock
    private WordRepository wordRepository;

    @Mock
    private UserKnownWordRepository userKnownWordRepository;

    @InjectMocks
    private WordService wordService;

    private Word highFreqWord;
    private Word lowFreqWord;
    private Word nullFreqWord;
    
    private UserKnownWord userKnownWord;

    @BeforeEach
    void setUp() {
        highFreqWord = new Word();
        highFreqWord.setId(1L);
        highFreqWord.setWord("the");
        highFreqWord.setGlobalFrequency(10000);

        lowFreqWord = new Word();
        lowFreqWord.setId(2L);
        lowFreqWord.setWord("apple");
        lowFreqWord.setGlobalFrequency(50);

        nullFreqWord = new Word();
        nullFreqWord.setId(3L);
        nullFreqWord.setWord("new-word");
        nullFreqWord.setGlobalFrequency(null);
        
        userKnownWord = new UserKnownWord();
        userKnownWord.setWord(highFreqWord);
    }

    @Test
    void testGetFrequentWords_ReturnsCorrectlyMappedDTOs() {
        // Arrange
        String language = "en";
        Integer limit = 10;
        Long userId = 1L;
        
        List<Word> wordsList = Arrays.asList(highFreqWord, lowFreqWord, nullFreqWord);
        
        when(wordRepository.findTopFrequentWords(eq(language), any(), eq(false), eq(false), eq(userId), any(PageRequest.class)))
                .thenReturn(wordsList);
                
        // Mock the user knowing only the 'highFreqWord' (id 1L)
        when(userKnownWordRepository.findByUserId(userId))
                .thenReturn(Collections.singletonList(userKnownWord));

        // Act
        List<WordDTO> result = wordService.getFrequentWords(language, null, 0, 10, userId, false);

        // Assert
        assertEquals(3, result.size());
        
        // Verify mapping of high frequency word (and that it is known)
        assertEquals("the", result.get(0).getWord());
        assertEquals(10000, result.get(0).getFrequency()); 
        assertTrue(result.get(0).getIsKnown());
        
        // Verify mapping of low frequency word (and that it is unknown)
        assertEquals("apple", result.get(1).getWord());
        assertEquals(50, result.get(1).getFrequency());
        assertFalse(result.get(1).getIsKnown());
        
        // Verify mapping of null frequency word
        assertEquals("new-word", result.get(2).getWord());
        assertEquals(null, result.get(2).getFrequency());
    }
}
