package com.sublex.repository;

import com.sublex.model.UserWordProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserWordProgressRepository extends JpaRepository<UserWordProgress, Long> {
    Optional<UserWordProgress> findByUserIdAndWordId(Long userId, Long wordId);
    List<UserWordProgress> findByUserIdAndWordIdIn(Long userId, List<Long> wordIds);
    Long countByUserId(Long userId);
    
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(u) FROM UserWordProgress u WHERE u.user.id = :userId AND u.successCount >= 5")
    Long countHighRetentionWordsByUserId(Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT COUNT(u) FROM UserWordProgress u WHERE u.user.id = :userId AND (u.nextReviewDate IS NULL OR u.nextReviewDate <= CURRENT_TIMESTAMP)")
    Long countWordsToReviewByUserId(Long userId);
}
