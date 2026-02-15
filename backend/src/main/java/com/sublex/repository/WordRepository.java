package com.sublex.repository;

import com.sublex.model.Word;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WordRepository extends JpaRepository<Word, Long> {

    Optional<Word> findByWordAndLanguage(String word, String language);

    boolean existsByWordAndLanguage(String word, String language);

    List<Word> findByWordContainingAndLanguage(String word, String language);

    @Query(value = "INSERT INTO word (word, language, created_at) VALUES (:word, :language, NOW()) ON CONFLICT (word, language) DO NOTHING", nativeQuery = true)
    void insertIgnore(@Param("word") String word, @Param("language") String language);

    @Query("SELECT w FROM Word w WHERE w.isEnriched = false OR w.isEnriched IS NULL ORDER BY w.id ASC LIMIT 10")
    List<Word> findPendingEnrichment();

    List<Word> findByWordInAndLanguage(java.util.Collection<String> words, String language);

    List<Word> findByLanguage(String language, org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<Word> findByLanguageAndIsEnrichedTrue(String language,
            org.springframework.data.domain.Pageable pageable);

    List<Word> findByLanguageAndIsEnrichedTrue(String language);

    @Query(value = "SELECT DISTINCT CAST(DATE(enriched_at) AS VARCHAR) FROM word WHERE language = :language AND is_enriched = true AND enriched_at IS NOT NULL ORDER BY 1 DESC", nativeQuery = true)
    List<String> findDistinctEnrichedDates(@Param("language") String language);

    List<Word> findByLanguageAndIsEnrichedTrueAndEnrichedAtBetween(String language, java.time.LocalDateTime start,
            java.time.LocalDateTime end);
}
