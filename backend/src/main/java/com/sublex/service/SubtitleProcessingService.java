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

        // 1. Parse subtitles and get word frequencies
        Map<String, Integer> wordFrequencies = SubtitleParser.parseSubtitles(subtitleContent);
        log.info("Parsed {} unique words", wordFrequencies.size());

        if (wordFrequencies.isEmpty()) {
            log.warn("No words found in subtitles for mediaId: {}", mediaId);
            return;
        }

        // 2. Clear existing words for this media
        mediaWordRepository.deleteAllInBatch(mediaWordRepository.findByMediaId(mediaId));
        log.info("Cleared existing words for mediaId: {}", mediaId);

        // 3. Batch Fetch Existing Words
        java.util.List<Word> existingWords = wordRepository.findByWordInAndLanguage(wordFrequencies.keySet(), language);
        Map<String, Word> wordMap = existingWords.stream()
                .collect(java.util.stream.Collectors.toMap(Word::getWord, w -> w));

        // 4. Identify and Batch Save New Words
        java.util.List<Word> newWords = new java.util.ArrayList<>();
        for (String wordText : wordFrequencies.keySet()) {
            if (!wordMap.containsKey(wordText)) {
                newWords.add(new Word(null, wordText, language, null));
            }
        }

        if (!newWords.isEmpty()) {
            log.info("Saving {} new words...", newWords.size());
            java.util.List<Word> savedNewWords = wordRepository.saveAll(newWords);
            savedNewWords.forEach(w -> wordMap.put(w.getWord(), w));
        }

        // 5. Create and Batch Save MediaWord Associations
        java.util.List<MediaWord> mediaWords = new java.util.ArrayList<>();
        for (Map.Entry<String, Integer> entry : wordFrequencies.entrySet()) {
            Word word = wordMap.get(entry.getKey());
            if (word != null) {
                mediaWords.add(new MediaWord(null, media, word, entry.getValue()));
            }
        }

        if (!mediaWords.isEmpty()) {
            log.info("Saving {} MediaWord associations...", mediaWords.size());
            mediaWordRepository.saveAll(mediaWords);
        }

        log.info("Subtitle processing completed for mediaId: {}", mediaId);
    }
}
