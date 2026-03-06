package com.sublex.repository;

import com.sublex.model.MediaWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaWordRepository extends JpaRepository<MediaWord, Long> {

       @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "word" })
       List<MediaWord> findByMediaId(Long mediaId);

       List<MediaWord> findByWordId(Long wordId);

       java.util.Optional<MediaWord> findByMediaIdAndWordId(Long mediaId, Long wordId);

       int countByMediaId(Long mediaId);

       @Query("SELECT mw FROM MediaWord mw " +
                     "WHERE mw.media.id = :mediaId " +
                     "AND mw.word.id NOT IN " +
                     "(SELECT ukw.word.id FROM UserKnownWord ukw WHERE ukw.user.id = :userId) " +
                     "ORDER BY mw.count DESC")
       List<MediaWord> findUnknownWordsByMediaAndUser(@Param("mediaId") Long mediaId,
                     @Param("userId") Long userId);

       @org.springframework.data.jpa.repository.Modifying
       @org.springframework.transaction.annotation.Transactional
       void deleteByMediaId(Long mediaId);

       @Query("SELECT mw.media.id, COUNT(mw) FROM MediaWord mw GROUP BY mw.media.id")
       List<Object[]> countAllByMediaId();

       @Query("SELECT mw.media.id, mw.word.difficulty, COUNT(mw) FROM MediaWord mw " +
                     "WHERE mw.word.difficulty IS NOT NULL " +
                     "GROUP BY mw.media.id, mw.word.difficulty")
       List<Object[]> findLevelCountsAllMedia();

       @Query("SELECT mw.media.id, COUNT(DISTINCT mw.word.id) FROM MediaWord mw " +
                     "WHERE mw.word.id IN " +
                     "(SELECT ukw.word.id FROM UserKnownWord ukw WHERE ukw.user.id = :userId) " +
                     "GROUP BY mw.media.id")
       List<Object[]> countKnownWordsPerMedia(@Param("userId") Long userId);
}
