package com.sublex.repository;

import com.sublex.model.UserWordNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Repository
public interface UserWordNoteRepository extends JpaRepository<UserWordNote, Long> {

    Optional<UserWordNote> findByUserIdAndWordId(Long userId, Long wordId);

    @Transactional
    void deleteByUserIdAndWordId(Long userId, Long wordId);

    @Query("SELECT n FROM UserWordNote n WHERE n.user.id = :userId AND n.word.id IN :wordIds")
    java.util.List<UserWordNote> findByUserIdAndWordIdIn(
        @Param("userId") Long userId,
        @Param("wordIds") Set<Long> wordIds
    );

    Long countByUserId(Long userId);

    @Query("SELECT n FROM UserWordNote n JOIN FETCH n.word WHERE n.user.id = :userId ORDER BY n.updatedAt DESC")
    java.util.List<UserWordNote> findAllByUserIdWithWord(@Param("userId") Long userId);
}
