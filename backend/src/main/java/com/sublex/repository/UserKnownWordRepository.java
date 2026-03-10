package com.sublex.repository;

import com.sublex.model.UserKnownWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserKnownWordRepository extends JpaRepository<UserKnownWord, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "word" })
    List<UserKnownWord> findByUserId(Long userId);

    Optional<UserKnownWord> findByUserIdAndWordId(Long userId, Long wordId);

    boolean existsByUserIdAndWordId(Long userId, Long wordId);

    @org.springframework.data.jpa.repository.Query("SELECT ukw.word.id FROM UserKnownWord ukw WHERE ukw.user.id = :userId")
    java.util.Set<Long> findWordIdsByUserId(Long userId);

    int countByUserId(Long userId);

    void deleteByUserIdAndWordId(Long userId, Long wordId);
}
