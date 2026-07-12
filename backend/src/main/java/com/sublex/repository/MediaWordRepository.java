package com.sublex.repository;

import com.sublex.model.MediaWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface MediaWordRepository extends JpaRepository<MediaWord, Long> {

       @org.springframework.data.jpa.repository.EntityGraph(attributePaths = { "word" })
       List<MediaWord> findByMediaId(Long mediaId);

       List<MediaWord> findByWordId(Long wordId);

       Optional<MediaWord> findByMediaIdAndWordId(Long mediaId, Long wordId);

       int countByMediaId(Long mediaId);

       @Query("SELECT mw FROM MediaWord mw " +
                     "WHERE mw.media.id = :mediaId " +
                     "AND (mw.word.isProperNoun IS NULL OR mw.word.isProperNoun = false) " +
                     "AND mw.word.id NOT IN " +
                     "(SELECT ukw.word.id FROM UserKnownWord ukw WHERE ukw.user.id = :userId) " +
                     "ORDER BY mw.count DESC")
       List<MediaWord> findUnknownWordsByMediaAndUser(@Param("mediaId") Long mediaId,
                     @Param("userId") Long userId);

       /**
        * Bulk delete directly in the database. Without @Query, Spring Data would
        * SELECT all rows (with their Word entities) into the JVM and delete them
        * one by one — on a 15k-word episode that spiked the heap to ~2.3 GB.
        */
       @Modifying
       @Transactional
       @Query("DELETE FROM MediaWord mw WHERE mw.media.id = :mediaId")
       void deleteByMediaId(@Param("mediaId") Long mediaId);

       @Query("SELECT mw.media.id, COUNT(mw) FROM MediaWord mw WHERE mw.word.isProperNoun IS NULL OR mw.word.isProperNoun = false GROUP BY mw.media.id")
       List<Object[]> countAllByMediaId();

       @Query("SELECT mw.media.id, mw.word.difficulty, COUNT(mw) FROM MediaWord mw " +
                     "WHERE mw.word.difficulty IS NOT NULL " +
                     "AND (mw.word.isProperNoun IS NULL OR mw.word.isProperNoun = false) " +
                     "GROUP BY mw.media.id, mw.word.difficulty")
       List<Object[]> findLevelCountsAllMedia();

       @Query("SELECT mw.media.id, COUNT(DISTINCT mw.word.id) FROM MediaWord mw " +
                     "JOIN UserKnownWord ukw ON mw.word.id = ukw.word.id " +
                     "WHERE ukw.user.id = :userId " +
                     "AND (mw.word.isProperNoun IS NULL OR mw.word.isProperNoun = false) " +
                     "GROUP BY mw.media.id")
       List<Object[]> countKnownWordsPerMedia(@Param("userId") Long userId);

       @Modifying
       @Transactional
       @Query(value = "UPDATE media_word mw " +
                     "SET count = mw.count + src.count " +
                     "FROM media_word src " +
                     "WHERE mw.word_id = :rootId " +
                     "AND src.word_id = :inflectedId " +
                     "AND mw.media_id = src.media_id", nativeQuery = true)
       void updateExistingCounts(@Param("inflectedId") Long inflectedId, @Param("rootId") Long rootId);

       @Modifying
       @Transactional
       @Query(value = "UPDATE media_word " +
                     "SET word_id = :rootId " +
                     "WHERE word_id = :inflectedId " +
                     "AND media_id NOT IN (SELECT media_id FROM media_word WHERE word_id = :rootId)", nativeQuery = true)
       void moveUniqueAssociations(@Param("inflectedId") Long inflectedId, @Param("rootId") Long rootId);

       @Modifying
       @Transactional
       @Query(value = "DELETE FROM media_word WHERE word_id = :inflectedId", nativeQuery = true)
       void deleteInflectedAfterMerge(@Param("inflectedId") Long inflectedId);
}
