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

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT wl FROM WordList wl LEFT JOIN FETCH wl.words WHERE wl.isSystem = true")
    List<WordList> findAllByIsSystemTrueWithWords();

    /** Kullanıcının kendi listeleri + tüm sistem listeleri (isSystem=true) */
    @org.springframework.data.jpa.repository.Query(
        "SELECT DISTINCT wl FROM WordList wl LEFT JOIN FETCH wl.words " +
        "WHERE wl.user.id = :userId OR wl.isSystem = true")
    List<WordList> findAllByUserIdOrSystem(@org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Query(
        "SELECT DISTINCT wl FROM WordList wl LEFT JOIN FETCH wl.sourceMedia " +
        "WHERE wl.user.id = :userId OR wl.isSystem = true")
    List<WordList> findAllByUserIdOrSystemWithoutWords(@org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Query(value =
           "SELECT wlw.word_list_id, " +
           "       COALESCE(w.root_word_id, w.id) AS effective_id, " +
           "       COALESCE(rw.is_proper_noun, w.is_proper_noun) AS is_proper_noun, " +
           "       COALESCE(rw.difficulty, w.difficulty) AS difficulty " +
           "FROM word_list_words wlw " +
           "JOIN word w ON wlw.word_id = w.id " +
           "LEFT JOIN word rw ON w.root_word_id = rw.id " +
           "WHERE wlw.word_list_id IN :listIds", nativeQuery = true)
    List<Object[]> findWordMetadataForLists(@org.springframework.data.repository.query.Param("listIds") java.util.List<Long> listIds);

    java.util.Optional<WordList> findByNameAndUserId(String name, Long userId);

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT wl FROM WordList wl LEFT JOIN FETCH wl.words WHERE wl.user.id = :userId AND wl.sourceMedia.imdbId = :imdbId")
    List<WordList> findByUserIdAndSourceMediaImdbIdWithWords(@org.springframework.data.repository.query.Param("userId") Long userId, @org.springframework.data.repository.query.Param("imdbId") String imdbId);


    java.util.Optional<WordList> findByName(String name);

    @org.springframework.data.jpa.repository.Query("SELECT wl.id FROM WordList wl JOIN wl.words w WHERE wl.user.id = :userId AND w.id = :wordId")
    List<Long> findListIdsByUserIdAndWordId(Long userId, Long wordId);

    @org.springframework.data.jpa.repository.Query("SELECT CASE WHEN COUNT(wl) > 0 THEN true ELSE false END FROM WordList wl JOIN wl.words w WHERE wl.user.id = :userId AND wl.isSystem = false AND w.id = :wordId")
    boolean existsByUserIdAndIsSystemFalseAndWordId(
            @org.springframework.data.repository.query.Param("userId") Long userId,
            @org.springframework.data.repository.query.Param("wordId") Long wordId);

    @org.springframework.data.jpa.repository.Query("SELECT wl.sourceMedia.id, wl.id FROM WordList wl WHERE wl.user.id = :userId AND wl.sourceMedia IS NOT NULL")
    List<Object[]> findMediaListMappingsByUserId(@org.springframework.data.repository.query.Param("userId") Long userId);
}
