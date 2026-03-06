package com.sublex.service;

import com.sublex.dto.WordDTO;
import com.sublex.dto.WordListDTO;
import com.sublex.dto.WordListWordsResponseDTO;
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
        private final UserMediaProgressService userMediaProgressService;

        public List<WordListDTO> getUserLists(Long userId) {
                return wordListRepository.findAllByUserId(userId).stream()
                                .map(list -> convertToDTO(list, userId))
                                .collect(Collectors.toList());
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

                if (Boolean.TRUE.equals(wordList.getIsSystem())) {
                        throw new RuntimeException("Words cannot be added to system lists.");
                }

                Word word = wordRepository.findById(wordId)
                                .orElseThrow(() -> new RuntimeException("Word not found: " + wordId));

                wordList.getWords().add(word);
                wordListRepository.save(wordList);
        }

        @Transactional
        public void removeWordFromList(Long listId, Long wordId) {
                WordList wordList = wordListRepository.findById(listId)
                                .orElseThrow(() -> new RuntimeException("List not found: " + listId));

                if (Boolean.TRUE.equals(wordList.getIsSystem())) {
                        throw new RuntimeException("Words cannot be removed from system lists.");
                }

                Word word = wordRepository.findById(wordId)
                                .orElseThrow(() -> new RuntimeException("Word not found: " + wordId));

                wordList.getWords().remove(word);
                wordListRepository.save(wordList);
        }

        @Transactional
        public void deleteList(Long listId) {
                WordList wordList = wordListRepository.findById(listId)
                                .orElseThrow(() -> new RuntimeException("List not found: " + listId));

                if (Boolean.TRUE.equals(wordList.getIsSystem())) {
                        throw new RuntimeException("System lists cannot be deleted.");
                }

                // Clear the ManyToMany relationship first to avoid constraint violation
                wordList.getWords().clear();
                wordListRepository.delete(wordList);
        }

        @Transactional
        public WordListDTO createUnknownWordsList(Long userId, Long mediaId) {
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

                WordList savedList = wordListRepository.save(wordList);

                // Record progress
                userMediaProgressService.recordProgress(userId, mediaId, "STARTED");

                return convertToDTO(savedList, userId);
        }

        @Transactional(readOnly = true)
        public List<WordListDTO> getStandardLists() {
                return wordListRepository.findAllByUserId(1L).stream()
                                .map(list -> convertToDTO(list, 1L)) // Default system user ID
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public WordListWordsResponseDTO getListWords(Long listId, Long userId, boolean onlyUnknown) {
                WordList wordList = wordListRepository.findById(listId)
                                .orElseThrow(() -> new RuntimeException("List not found: " + listId));

                // Get user's known words
                Set<Long> knownWordIds = userKnownWordRepository.findByUserId(userId).stream()
                                .map(ukw -> ukw.getWord().getId())
                                .collect(Collectors.toSet());

                // Filter and convert to DTOs
                List<WordDTO> words = wordList.getWords().stream()
                                .map(word -> convertToWordDTO(word, knownWordIds.contains(word.getId())))
                                .filter(w -> !onlyUnknown || !w.getIsKnown())
                                .collect(Collectors.toList());

                // Calculate stats
                int totalWords = wordList.getWords().size();
                int unknownCount = (int) wordList.getWords().stream()
                                .filter(word -> !knownWordIds.contains(word.getId()))
                                .count();

                java.util.Map<String, Long> levelCounts = wordList.getWords().stream()
                                .filter(w -> w.getDifficulty() != null)
                                .collect(Collectors.groupingBy(Word::getDifficulty, Collectors.counting()));

                WordListWordsResponseDTO response = new WordListWordsResponseDTO();
                response.setList(convertToDTO(wordList, userId));
                response.setWords(words);
                response.setTotalWords(totalWords);
                response.setUnknownWords(unknownCount);
                response.setLevelCounts(levelCounts);

                return response;
        }

        @Transactional
        public WordListDTO createSubListFromUnknown(Long userId, Long listId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

                WordList sourceList = wordListRepository.findById(listId)
                                .orElseThrow(() -> new RuntimeException("Source list not found: " + listId));

                Set<Long> knownWordIds = userKnownWordRepository.findByUserId(userId).stream()
                                .map(ukw -> ukw.getWord().getId())
                                .collect(Collectors.toSet());

                List<Word> unknownWords = sourceList.getWords().stream()
                                .filter(word -> !knownWordIds.contains(word.getId()))
                                .collect(Collectors.toList());

                WordList newList = new WordList();
                newList.setName(sourceList.getName() + " (Unknown Words)");
                newList.setUser(user);
                newList.getWords().addAll(unknownWords);

                WordList saved = wordListRepository.save(newList);
                return convertToDTO(saved, userId);
        }

        public WordListDTO convertToDTO(WordList list, Long userId) {
                WordListDTO dto = new WordListDTO();
                dto.setId(list.getId());
                dto.setName(list.getName());
                dto.setCreatedAt(list.getCreatedAt());
                dto.setIsSystem(list.getIsSystem());

                int totalWords = list.getWords().size();
                dto.setTotalWords(totalWords);

                if (userId != null) {
                        Set<Long> knownWordIds = userKnownWordRepository.findByUserId(userId).stream()
                                        .map(ukw -> ukw.getWord().getId())
                                        .collect(Collectors.toSet());

                        long unknownCount = list.getWords().stream()
                                        .filter(word -> !knownWordIds.contains(word.getId()))
                                        .count();
                        dto.setUnknownWords((int) unknownCount);
                }

                java.util.Map<String, Long> levelCounts = list.getWords().stream()
                                .filter(w -> w.getDifficulty() != null)
                                .collect(Collectors.groupingBy(Word::getDifficulty, Collectors.counting()));
                dto.setLevelCounts(levelCounts);

                return dto;
        }

        private WordDTO convertToWordDTO(Word word, boolean isKnown) {
                WordDTO dto = new WordDTO();
                dto.setId(word.getId());
                dto.setWord(word.getWord());
                dto.setLanguage(word.getLanguage());
                dto.setIsKnown(isKnown);
                dto.setDefinition(word.getDefinition());
                dto.setDifficulty(word.getDifficulty());
                dto.setIsEnriched(word.getIsEnriched());
                dto.setIsProperNoun(word.getIsProperNoun());
                return dto;
        }

        @Transactional(readOnly = true)
        public WordList getKnownWordsList(Long userId) {
                User user = userRepository.findById(userId)
                                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

                List<UserKnownWord> knownWords = userKnownWordRepository.findByUserId(userId);

                WordList wordList = new WordList();
                wordList.setId(-1L); // Special ID for frontend
                wordList.setName("Bilinen Kelimeler");
                wordList.setUser(user);
                wordList.setCreatedAt(LocalDateTime.now()); // Or earliest known word date

                Set<Word> words = knownWords.stream()
                                .map(UserKnownWord::getWord)
                                .collect(Collectors.toSet());

                wordList.setWords(words);

                return wordList;
        }

        public List<Long> getListsContainingWord(Long userId, Long wordId) {
                return wordListRepository.findListIdsByUserIdAndWordId(userId, wordId);
        }
}
