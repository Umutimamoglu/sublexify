package com.sublex.service;

import com.sublex.model.Media;
import com.sublex.model.User;
import com.sublex.model.UserMediaProgress;
import com.sublex.repository.MediaRepository;
import com.sublex.repository.UserMediaProgressRepository;
import com.sublex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserMediaProgressService {

    private final UserMediaProgressRepository progressRepository;
    private final UserRepository userRepository;
    private final MediaRepository mediaRepository;

    @Transactional
    public void recordProgress(Long userId, Long mediaId, String status) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new RuntimeException("Media not found: " + mediaId));

        UserMediaProgress progress = progressRepository.findByUserIdAndMediaId(userId, mediaId)
                .orElse(UserMediaProgress.builder()
                        .user(user)
                        .media(media)
                        .status("STARTED")
                        .build());

        if (status != null) {
            progress.setStatus(status);
        }
        progress.setLastAccessedAt(LocalDateTime.now());

        progressRepository.save(progress);
    }

    public List<Media> getRecentMediaForUser(Long userId, int limit) {
        List<UserMediaProgress> progresses = progressRepository.findAllByUserIdOrderByLastAccessedAtDesc(userId);
        
        List<Media> result = new java.util.ArrayList<>();
        java.util.Map<String, Integer> imdbIdCounts = new java.util.HashMap<>();
        
        for (UserMediaProgress progress : progresses) {
            Media m = progress.getMedia();
            
            if (m.getImdbId() != null) {
                int count = imdbIdCounts.getOrDefault(m.getImdbId(), 0);
                if (count >= 2) {
                    continue; // max 2 items per Series/Movie
                }
                imdbIdCounts.put(m.getImdbId(), count + 1);
            }
            
            result.add(m);
            if (result.size() >= limit) {
                break;
            }
        }
        
        return result;
    }
}
