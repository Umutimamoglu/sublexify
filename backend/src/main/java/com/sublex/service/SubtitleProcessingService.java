package com.sublex.service;

import com.sublex.model.Media;
import com.sublex.model.MediaWord;
import com.sublex.model.Word;
import com.sublex.repository.MediaRepository;
import com.sublex.repository.MediaWordRepository;
import com.sublex.repository.WordRepository;
import com.sublex.util.SubtitleParser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
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
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Media not found: " + mediaId));

        // Parse subtitles and get word frequencies
        Map<String, Integer> wordFrequencies = SubtitleParser.parseSubtitles(subtitleContent);

        // Save each word and create MediaWord association
        wordFrequencies.forEach((wordText, count) -> {
            // Find or create word
            Word word = wordRepository.findByWordAndLanguage(wordText, language)
                    .orElseGet(() -> {
                        Word newWord = new Word();
                        newWord.setWord(wordText);
                        newWord.setLanguage(language);
                        return wordRepository.save(newWord);
                    });

            // Create MediaWord association
            MediaWord mediaWord = new MediaWord();
            mediaWord.setMedia(media);
            mediaWord.setWord(word);
            mediaWord.setCount(count);
            mediaWordRepository.save(mediaWord);
        });
    }
}
