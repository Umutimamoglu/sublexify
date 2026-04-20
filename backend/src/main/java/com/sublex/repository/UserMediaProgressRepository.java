package com.sublex.repository;

import com.sublex.model.UserMediaProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserMediaProgressRepository extends JpaRepository<UserMediaProgress, Long> {

    List<UserMediaProgress> findAllByUserIdOrderByLastAccessedAtDesc(Long userId);

    Optional<UserMediaProgress> findByUserIdAndMediaId(Long userId, Long mediaId);

    @Query("SELECT p.media.id FROM UserMediaProgress p WHERE p.user.id = :userId AND p.status = 'WATCHED'")
    List<Long> findWatchedMediaIdsByUserId(Long userId);
}

