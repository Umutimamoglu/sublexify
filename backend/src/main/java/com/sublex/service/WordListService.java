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
import java.util.Optional;
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
        private final UserWordProgressRepository userWordProgressRepository;

        public Set<Long> getKnownWordIds(Long userId) {
                return userKnownWordRepository.findWordIdsByUserId(userId);
        }

        public List<WordListDTO> getUserLists(Long userId) {
                Set<Long> knownWordIds = userKnownWordRepository.findWordIdsByUserId(userId);
                // Kullanıcının kendi listelerini + sistem listelerini birlikte getir
                return wordListRepository.findAllByUserIdOrSystem(userId).stream()
                                .map(list -> convertToDTO(list, userId, knownWordIds))
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

                boolean isKnown = userKnownWordRepository.existsByUserIdAndWordId(wordList.getUser().getId(), wordId);
                if (isKnown) {
                        Optional<UserWordProgress> opt = userWordProgressRepository
                                        .findByUserIdAndWordId(wordList.getUser().getId(), wordId);
                        if (opt.isEmpty()) {
                                UserWordProgress p = new UserWordProgress();
                                p.setUser(wordList.getUser());
                                p.setWord(word);
                                p.setReviewCount(0);
                                p.setSuccessCount(0);
                                p.setNextReviewDate(LocalDateTime.now().plusDays(1));
                                userWordProgressRepository.save(p);
                        }
                }
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

                // Filter for unknown words, resolving root words
                List<Word> unknownWords = mediaWords.stream()
                                .map(MediaWord::getWord)
                                .map(word -> word.getRootWord() != null ? word.getRootWord() : word)
                                .distinct()
                                .filter(word -> !Boolean.TRUE.equals(word.getIsProperNoun()))
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
                wordList.setSourceMedia(media);
                wordList.getWords().addAll(unknownWords);

                WordList savedList = wordListRepository.save(wordList);

                userMediaProgressService.recordProgress(userId, mediaId, "STARTED");

                return convertToDTO(savedList, userId, knownWordIds);
        }

        @Transactional(readOnly = true)
        public List<WordListDTO> getStandardLists(Long userId) {
                // Standard lists are seeded under system user (id=1), but known-word
                // status must reflect the actual authenticated user.
                Set<Long> knownWordIds = userKnownWordRepository.findWordIdsByUserId(userId);
                return wordListRepository.findAllByUserIdWithWords(1L).stream()
                                .map(list -> convertToDTO(list, userId, knownWordIds))
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public WordListWordsResponseDTO getListWords(Long listId, Long userId, boolean onlyUnknown) {
                WordList wordList = wordListRepository.findById(listId)
                                .orElseThrow(() -> new RuntimeException("List not found: " + listId));

                // Get user's known words once
                Set<Long> knownWordIds = userKnownWordRepository.findWordIdsByUserId(userId);

                // Filter and convert to DTOs, and calculate stats in a single pass if possible
                // But for now, let's at least share the knownWordIds set
                List<WordDTO> words = wordList.getWords().stream()
                                .map(word -> word.getRootWord() != null ? word.getRootWord() : word)
                                .distinct()
                                .filter(word -> !Boolean.TRUE.equals(word.getIsProperNoun()))
                                .map(word -> convertToWordDTO(word, knownWordIds.contains(word.getId())))
                                .filter(w -> !onlyUnknown || !w.getIsKnown())
                                .collect(Collectors.toList());

                WordListWordsResponseDTO response = new WordListWordsResponseDTO();
                response.setList(convertToDTO(wordList, userId, knownWordIds));
                response.setWords(words);

                // Use the stats already calculated in convertToDTO via the response.setList
                // call
                response.setTotalWords(response.getList().getTotalWords());
                response.setUnknownWords(response.getList().getUnknownWords());
                response.setLevelCounts(response.getList().getLevelCounts());

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
                                .map(word -> word.getRootWord() != null ? word.getRootWord() : word)
                                .distinct()
                                .filter(word -> !Boolean.TRUE.equals(word.getIsProperNoun()))
                                .filter(word -> !knownWordIds.contains(word.getId()))
                                .collect(Collectors.toList());

                WordList newList = new WordList();
                newList.setName(sourceList.getName() + " (Unknown Words)");
                newList.setUser(user);
                newList.getWords().addAll(unknownWords);

                WordList saved = wordListRepository.save(newList);
                return convertToDTO(saved, userId, knownWordIds);
        }

        public WordListDTO convertToDTO(WordList list, Long userId) {
                Set<Long> knownWordIds = userKnownWordRepository.findWordIdsByUserId(userId);
                return convertToDTO(list, userId, knownWordIds);
        }

        public WordListDTO convertToDTO(WordList list, Long userId, Set<Long> knownWordIds) {
                WordListDTO dto = new WordListDTO();
                dto.setId(list.getId());
                dto.setName(list.getName());
                dto.setCreatedAt(list.getCreatedAt());
                dto.setIsSystem(list.getIsSystem());

                // Single pass over words to calculate all stats
                int totalWords = 0;
                int unknownWords = 0;
                java.util.Map<String, Long> levelCounts = new java.util.HashMap<>();
                java.util.Set<Long> processedIds = new java.util.HashSet<>();

                for (Word w : list.getWords()) {
                        Word word = w.getRootWord() != null ? w.getRootWord() : w;
                        
                        if (!processedIds.add(word.getId())) {
                                continue;
                        }

                        if (Boolean.TRUE.equals(word.getIsProperNoun())) {
                                continue;
                        }

                        totalWords++;

                        if (knownWordIds != null && !knownWordIds.contains(word.getId())) {
                                unknownWords++;
                        }

                        if (word.getDifficulty() != null) {
                                levelCounts.merge(word.getDifficulty(), 1L, Long::sum);
                        }
                }

                dto.setTotalWords(totalWords);
                dto.setUnknownWords(unknownWords);
                dto.setLevelCounts(levelCounts);
                dto.setColor(list.getColor());

                if (list.getSourceMedia() != null) {
                        dto.setSourceMediaId(list.getSourceMedia().getId());
                        dto.setSourceMediaPosterUrl(list.getSourceMedia().getPosterUrl());
                }

                return dto;
        }

        @Transactional
        public WordListDTO updateList(Long listId, String name, String color, Long userId) {
                WordList list = wordListRepository.findById(listId)
                                .orElseThrow(() -> new RuntimeException("List not found: " + listId));
                if (name != null && !name.isBlank()) {
                        list.setName(name.trim());
                }
                // null = don't touch, empty string = remove color
                if (color != null) {
                        list.setColor(color.isBlank() ? null : color);
                }
                WordList saved = wordListRepository.save(list);
                return convertToDTO(saved, userId, getKnownWordIds(userId));
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
                                .map(word -> word.getRootWord() != null ? word.getRootWord() : word)
                                .filter(word -> !Boolean.TRUE.equals(word.getIsProperNoun()))
                                .collect(Collectors.toSet());

                wordList.setWords(words);

                return wordList;
        }

        public List<Long> getListsContainingWord(Long userId, Long wordId) {
                return wordListRepository.findListIdsByUserIdAndWordId(userId, wordId);
        }
}
