package com.sublex.repository;

import com.sublex.model.MediaWord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaWordRepository extends JpaRepository<MediaWord, Long> {

       List<MediaWord> findByMediaId(Long mediaId);

       List<MediaWord> findByWordId(Long wordId);

       int countByMediaId(Long mediaId);

       @Query("SELECT mw FROM MediaWord mw " +
                     "WHERE mw.media.id = :mediaId " +
                     "AND mw.word.id NOT IN " +
                     "(SELECT ukw.word.id FROM UserKnownWord ukw WHERE ukw.user.id = :userId) " +
                     "ORDER BY mw.count DESC")
       List<MediaWord> findUnknownWordsByMediaAndUser(@Param("mediaId") Long mediaId,
                     @Param("userId") Long userId);
}
