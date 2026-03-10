package com.sublex.repository;

import com.sublex.model.WordList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WordListRepository extends JpaRepository<WordList, Long> {
    List<WordList> findAllByUserId(Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT wl FROM WordList wl LEFT JOIN FETCH wl.words WHERE wl.user.id = :userId")
    List<WordList> findAllByUserIdWithWords(@org.springframework.data.repository.query.Param("userId") Long userId);

    java.util.Optional<WordList> findByNameAndUserId(String name, Long userId);

    java.util.Optional<WordList> findByName(String name);

    @org.springframework.data.jpa.repository.Query("SELECT wl.id FROM WordList wl JOIN wl.words w WHERE wl.user.id = :userId AND w.id = :wordId")
    List<Long> findListIdsByUserIdAndWordId(Long userId, Long wordId);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(wl) > 0 THEN true ELSE false END FROM WordList wl JOIN wl.words w WHERE wl.user.id = :userId AND wl.isSystem = false AND w.id = :wordId")
    boolean existsByUserIdAndIsSystemFalseAndWordId(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("wordId") Long wordId);
}
