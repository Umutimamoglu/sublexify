package com.sublex.service;

import com.sublex.model.User;
import com.sublex.model.UserWordNote;
import com.sublex.model.Word;
import com.sublex.repository.UserRepository;
import com.sublex.repository.UserWordNoteRepository;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserWordNoteService {

    private final UserWordNoteRepository userWordNoteRepository;
    private final UserRepository userRepository;
    private final WordRepository wordRepository;

    /**
     * Creates or updates the note for a (user, word) pair.
     */
    @Transactional
    public UserWordNote upsertNote(Long userId, Long wordId, String note) {
        Optional<UserWordNote> existing = userWordNoteRepository.findByUserIdAndWordId(userId, wordId);

        if (existing.isPresent()) {
            UserWordNote uwn = existing.get();
            uwn.setNote(note);
            return userWordNoteRepository.save(uwn);
        }

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        Word word = wordRepository.findById(wordId)
            .orElseThrow(() -> new RuntimeException("Word not found: " + wordId));

        UserWordNote uwn = new UserWordNote();
        uwn.setUser(user);
        uwn.setWord(word);
        uwn.setNote(note);
        return userWordNoteRepository.save(uwn);
    }

    /**
     * Deletes the note for a (user, word) pair. No-op if note doesn't exist.
     */
    @Transactional
    public void deleteNote(Long userId, Long wordId) {
        userWordNoteRepository.deleteByUserIdAndWordId(userId, wordId);
    }

    /**
     * Returns a map of wordId → note for the given user and word IDs.
     * Useful for bulk-enriching list responses.
     */
    @Transactional(readOnly = true)
    public Map<Long, String> getNoteMap(Long userId, Set<Long> wordIds) {
        if (wordIds == null || wordIds.isEmpty()) return Map.of();
        return userWordNoteRepository.findByUserIdAndWordIdIn(userId, wordIds)
            .stream()
            .collect(Collectors.toMap(
                n -> n.getWord().getId(),
                UserWordNote::getNote
            ));
    }

    /**
     * Returns the note text for a single word, or null if none.
     */
    @Transactional(readOnly = true)
    public String getNote(Long userId, Long wordId) {
        return userWordNoteRepository.findByUserIdAndWordId(userId, wordId)
            .map(UserWordNote::getNote)
            .orElse(null);
    }
}
