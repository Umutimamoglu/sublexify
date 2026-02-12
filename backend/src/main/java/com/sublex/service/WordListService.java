package com.sublex.service;

import com.sublex.dto.WordDTO;
import com.sublex.model.*;
import com.sublex.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WordListService {

    private final WordListRepository wordListRepository;
    private final UserRepository userRepository;
    private final WordRepository wordRepository;
    private final MediaRepository mediaRepository;
    private final MediaWordRepository mediaWordRepository;
    private final UserKnownWordRepository userKnownWordRepository;

    public List<WordList> getUserLists(Long userId) {
        return wordListRepository.findAllByUserId(userId);
    }

    public WordList getListById(Long listId) {
        return wordListRepository.findById(listId)
                .orElseThrow(() -> new RuntimeException("List not found: " + listId));
    }

    @Transactional
    public WordList createList(Long userId, String name) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        WordList wordList = new WordList();
        wordList.setName(name);
        wordList.setUser(user);

        return wordListRepository.save(wordList);
    }

    @Transactional
    public void addWordToList(Long listId, Long wordId) {
        WordList wordList = wordListRepository.findById(listId)
                .orElseThrow(() -> new RuntimeException("List not found: " + listId));

        Word word = wordRepository.findById(wordId)
                .orElseThrow(() -> new RuntimeException("Word not found: " + wordId));

        wordList.getWords().add(word);
        wordListRepository.save(wordList);
    }

    @Transactional
    public void removeWordFromList(Long listId, Long wordId) {
        WordList wordList = wordListRepository.findById(listId)
                .orElseThrow(() -> new RuntimeException("List not found: " + listId));

        Word word = wordRepository.findById(wordId)
                .orElseThrow(() -> new RuntimeException("Word not found: " + wordId));

        wordList.getWords().remove(word);
        wordListRepository.save(wordList);
    }

    @Transactional
    public WordList createUnknownWordsList(Long userId, Long mediaId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Media not found: " + mediaId));

        // Get all words in media
        List<MediaWord> mediaWords = mediaWordRepository.findByMediaId(mediaId);

        // Get user's known words
        Set<Long> knownWordIds = userKnownWordRepository.findByUserId(userId).stream()
                .map(ukw -> ukw.getWord().getId())
                .collect(Collectors.toSet());

        // Filter for unknown words
        List<Word> unknownWords = mediaWords.stream()
                .map(MediaWord::getWord)
                .filter(word -> !knownWordIds.contains(word.getId()))
                .collect(Collectors.toList());

        // Create new list
        String listName = media.getTitle();
        if (media.getSeasonNumber() != null && media.getEpisodeNumber() != null) {
            listName += " - S" + media.getSeasonNumber() + "E" + media.getEpisodeNumber();
        }
        listName += " (Unknown Words)";

        WordList wordList = new WordList();
        wordList.setName(listName);
        wordList.setUser(user);
        wordList.getWords().addAll(unknownWords);

        return wordListRepository.save(wordList);
    }
}
