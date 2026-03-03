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

        // 1. Parse subtitles and get word data (counts + context)
        // Returns Map<String, WordData>
        Map<String, SubtitleParser.WordData> wordDataMap = SubtitleParser.parseSubtitles(subtitleContent);

        // Filter out short words not in whitelist
        java.util.Set<String> shortWordWhitelist = java.util.Set.of(
                "a", "i", "am", "an", "as", "at", "be", "by", "do", "go", "he", "hi", "if", "in", "is", "it",
                "me", "my", "no", "of", "oh", "on", "or", "ox", "so", "to", "up", "us", "we",
                "ah", "eh", "ha", "ho", "ow", "ya", "yo");

        wordDataMap.entrySet().removeIf(entry -> {
            String w = entry.getKey().toLowerCase();
            // 1. Çok kısa kelimeleri at (whitelist hariç)
            if (w.length() <= 2 && !shortWordWhitelist.contains(w))
                return true;
            // 2. 3+ tire segmenti olan cümle parçalarını at (örn:
            // 'hotshot-chef-at-the-big-fancy')
            if (w.split("-").length >= 4)
                return true;
            // 3. 30 karakterden uzun tokenları at
            if (w.length() > 30)
                return true;
            return false;
        });

        log.info("Parsed {} unique words (after filtering short words)", wordDataMap.size());

        if (wordDataMap.isEmpty()) {
            log.warn("No words found in subtitles for mediaId: {}", mediaId);
            return;
        }

        // 2. Save subtitle content to media
        media.setSubtitleContent(subtitleContent);
        mediaRepository.save(media);

        // 3. Clear existing words for this media
        mediaWordRepository.deleteAllInBatch(mediaWordRepository.findByMediaId(mediaId));
        log.info("Cleared existing words for mediaId: {}", mediaId);

        // 3. DICTIONARY UPDATE (SYNCHRONIZED & TRANSACTIONAL)
        Map<String, Word> wordMap;
        synchronized (DICTIONARY_LOCK) {
            wordMap = transactionTemplate.execute(status -> {
                // 3.1 Batch Fetch Existing Words
                java.util.List<Word> existingWords = wordRepository.findByWordInAndLanguage(wordDataMap.keySet(),
                        language);
                Map<String, Word> currentMap = existingWords.stream()
                        .collect(java.util.stream.Collectors.toMap(Word::getWord, w -> w));

                // 3.2 Identify and Batch Save New Words
                java.util.List<Word> newWords = new java.util.ArrayList<>();
                for (Map.Entry<String, SubtitleParser.WordData> entry : wordDataMap.entrySet()) {
                    String wordText = entry.getKey();
                    if (!currentMap.containsKey(wordText)) {
                        SubtitleParser.WordData data = entry.getValue();
                        newWords.add(Word.builder()
                                .word(wordText)
                                .language(language)
                                .status("PENDING") // Mark for async analysis
                                .contextSentence(data.context) // Save the context!
                                .build());
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

        // 4. Create and Batch Save MediaWord Associations (Aggregated by Root)
        Map<Long, MediaWord> aggregatedMediaWords = new java.util.HashMap<>(); // wordId -> MediaWord

        for (Map.Entry<String, SubtitleParser.WordData> entry : wordDataMap.entrySet()) {
            Word word = wordMap.get(entry.getKey());
            if (word != null) {
                // If the word has a root, we use the root word for the association
                Word targetWord = word.getRootWord() != null ? word.getRootWord() : word;
                Long targetWordId = targetWord.getId();

                int countToAdd = entry.getValue().count;

                if (aggregatedMediaWords.containsKey(targetWordId)) {
                    MediaWord existing = aggregatedMediaWords.get(targetWordId);
                    existing.setCount(existing.getCount() + countToAdd);
                } else {
                    aggregatedMediaWords.put(targetWordId, new MediaWord(null, media, targetWord, countToAdd));
                }
            }
        }

        if (!aggregatedMediaWords.isEmpty()) {
            java.util.List<MediaWord> toSave = new java.util.ArrayList<>(aggregatedMediaWords.values());
            log.info("Saving {} aggregated MediaWord associations...", toSave.size());
            mediaWordRepository.saveAll(toSave);
        }

        log.info("Subtitle processing completed for mediaId: {}", mediaId);
    }
}
