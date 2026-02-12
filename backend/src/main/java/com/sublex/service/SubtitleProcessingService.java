package com.sublex.service;

import com.sublex.model.Media;
import com.sublex.model.MediaWord;
import com.sublex.model.Word;
import com.sublex.repository.MediaRepository;
import com.sublex.repository.MediaWordRepository;
import com.sublex.repository.WordRepository;
import com.sublex.util.SubtitleParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SubtitleProcessingService {

    private final MediaRepository mediaRepository;
    private final WordRepository wordRepository;
    private final MediaWordRepository mediaWordRepository;

    /**
     * Process subtitle file and save words to database
     * 
     * @param mediaId         The media ID
     * @param subtitleContent The .srt file content
     */
    @Transactional
    public void processSubtitles(Long mediaId, String subtitleContent, String language) {
        log.info("Processing subtitles for mediaId: {}, length: {}", mediaId, subtitleContent.length());

        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Media not found: " + mediaId));

        // Parse subtitles and get word frequencies
        Map<String, Integer> wordFrequencies = SubtitleParser.parseSubtitles(subtitleContent);
        log.info("Parsed {} unique words", wordFrequencies.size());

        // Clear existing words for this media to prevent duplicate key errors
        mediaWordRepository.deleteAllInBatch(mediaWordRepository.findByMediaId(mediaId));
        log.info("Cleared existing words for mediaId: {}", mediaId);

        // Save each word and create MediaWord association
        wordFrequencies.forEach((wordText, count) -> {
            // Find or create word
            Word word = wordRepository.findByWordAndLanguage(wordText, language)
                    .orElseGet(() -> {
                        Word newWord = new Word(null, wordText, language, null);
                        return wordRepository.save(newWord);
                    });

            // Create MediaWord association
            MediaWord mediaWord = new MediaWord(null, media, word, count);
            mediaWordRepository.save(mediaWord);
        });

        log.info("Subtitle processing completed for mediaId: {}", mediaId);
    }
}
