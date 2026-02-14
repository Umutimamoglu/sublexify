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

    private static final Object DICTIONARY_LOCK = new Object();
    private final org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    /**
     * Process subtitle file and save words to database
     * 
     * @param mediaId         The media ID
     * @param subtitleContent The .srt file content
     */
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

        // 3. DICTIONARY UPDATE (SYNCHRONIZED & TRANSACTIONAL)
        // We lock this section to ensure only one thread checks/inserts words at a
        // time.
        // We use transactionTemplate to ensure the commit happens BEFORE the lock is
        // released.
        Map<String, Word> wordMap;
        synchronized (DICTIONARY_LOCK) {
            wordMap = transactionTemplate.execute(status -> {
                // 3.1 Batch Fetch Existing Words
                java.util.List<Word> existingWords = wordRepository.findByWordInAndLanguage(wordFrequencies.keySet(),
                        language);
                Map<String, Word> currentMap = existingWords.stream()
                        .collect(java.util.stream.Collectors.toMap(Word::getWord, w -> w));

                // 3.2 Identify and Batch Save New Words
                java.util.List<Word> newWords = new java.util.ArrayList<>();
                for (String wordText : wordFrequencies.keySet()) {
                    if (!currentMap.containsKey(wordText)) {
                        newWords.add(new Word(null, wordText, language, null));
                    }
                }

                if (!newWords.isEmpty()) {
                    log.info("Thread {} acquiring lock: Saving {} new words...", Thread.currentThread().getName(),
                            newWords.size());
                    java.util.List<Word> savedNewWords = wordRepository.saveAll(newWords);
                    savedNewWords.forEach(w -> currentMap.put(w.getWord(), w));
                }

                return currentMap;
            });
        }

        // 4. Create and Batch Save MediaWord Associations
        // This does not need to be synchronized as it affects only this specific Media
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
