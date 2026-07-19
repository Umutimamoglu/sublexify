package com.sublex.service;

import com.sublex.model.User;
import com.sublex.model.UserListPreference;
import com.sublex.model.WordList;
import com.sublex.repository.UserListPreferenceRepository;
import com.sublex.repository.UserRepository;
import com.sublex.repository.WordListRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserListPreferenceService {

    private final UserListPreferenceRepository preferenceRepository;
    private final UserRepository userRepository;
    private final WordListRepository wordListRepository;

    public List<Long> getHiddenListIds(Long userId) {
        return preferenceRepository.findHiddenListIdsByUserId(userId);
    }

    @Transactional
    public void syncHiddenLists(Long userId, List<Long> hiddenListIds) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        // Delete existing preferences
        preferenceRepository.deleteAllByUserId(userId);

        if (hiddenListIds == null || hiddenListIds.isEmpty()) {
            return;
        }

        // Filter valid list IDs and create new preferences
        List<WordList> lists = wordListRepository.findAllById(hiddenListIds);
        
        List<UserListPreference> newPreferences = lists.stream()
                .map(list -> new UserListPreference(null, user, list, true))
                .collect(Collectors.toList());

        preferenceRepository.saveAll(newPreferences);
        log.info("Synced {} hidden lists for user {}", newPreferences.size(), userId);
    }
}
