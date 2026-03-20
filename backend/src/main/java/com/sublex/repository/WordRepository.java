package com.sublex.repository;

import com.sublex.model.Word;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WordRepository extends JpaRepository<Word, Long>, JpaSpecificationExecutor<Word> {

        Optional<Word> findByWordAndLanguage(String word, String language);

        List<Word> findByWordIn(java.util.Collection<String> words);

        @Query("SELECT w FROM Word w WHERE w.status = 'PENDING' OR (w.status = 'FAILED' AND w.retryCount < 3)")
        List<Word> findWordsForAnalysis(org.springframework.data.domain.Pageable pageable);

        boolean existsByWordAndLanguage(String word, String language);

        List<Word> findByWordContainingAndLanguage(String word, String language);

        @Query(value = "INSERT INTO word (word, language, created_at) VALUES (:word, :language, NOW()) ON CONFLICT (word, language) DO NOTHING", nativeQuery = true)
        void insertIgnore(@Param("word") String word, @Param("language") String language);

        @Query("SELECT w FROM Word w WHERE w.status = 'PROCESSED' AND (w.isEnriched = false OR w.isEnriched IS NULL) AND w.rootWord IS NULL ORDER BY w.id ASC LIMIT 50")
        List<Word> findPendingEnrichment();

        @Query("SELECT mw.word FROM MediaWord mw WHERE mw.media.id = :mediaId AND mw.word.language = 'en' AND mw.word.status = 'PROCESSED' AND (mw.word.isEnriched = false OR mw.word.isEnriched IS NULL) AND mw.word.rootWord IS NULL ORDER BY mw.word.id ASC")
        List<Word> findPendingEnrichmentByMediaId(@Param("mediaId") Long mediaId,
                        org.springframework.data.domain.Pageable pageable);

        List<Word> findByWordInAndLanguage(java.util.Collection<String> words, String language);

        List<Word> findByLanguage(String language, org.springframework.data.domain.Pageable pageable);

        org.springframework.data.domain.Page<Word> findByLanguageAndIsEnrichedTrue(String language,
                        org.springframework.data.domain.Pageable pageable);

        org.springframework.data.domain.Page<Word> findByLanguageAndIsEnrichedTrueAndNeedsReEnrichmentTrue(
                        String language,
                        org.springframework.data.domain.Pageable pageable);

        org.springframework.data.domain.Page<Word> findByLanguageAndIsEnrichedTrueAndIsVerifiedTrue(
                        String language,
                        org.springframework.data.domain.Pageable pageable);

        org.springframework.data.domain.Page<Word> findByLanguageAndIsEnrichedTrueAndJudgeStatus(
                        String language,
                        String judgeStatus,
                        org.springframework.data.domain.Pageable pageable);

        List<Word> findByLanguageAndIsEnrichedTrueAndNeedsReEnrichmentTrue(String language);

        List<Word> findByLanguageAndIsEnrichedTrueAndIsVerifiedTrue(String language);

        List<Word> findByLanguageAndIsEnrichedTrueAndJudgeStatus(String language, String judgeStatus);

        List<Word> findByLanguageAndIsEnrichedTrue(String language);

        @Query(value = "SELECT DISTINCT TO_CHAR(enriched_at, 'YYYY-MM-DD HH24:MI') FROM word WHERE language = :language AND is_enriched = true AND enriched_at IS NOT NULL ORDER BY 1 DESC", nativeQuery = true)
        List<String> findDistinctEnrichedDates(@Param("language") String language);

        @Query("SELECT w FROM Word w WHERE w.language = :language AND w.isEnriched = true AND TO_CHAR(w.enrichedAt, 'YYYY-MM-DD HH24:MI') = :dateTime")
        org.springframework.data.domain.Page<Word> findByLanguageAndEnrichedAtPrecision(
                        @Param("language") String language, @Param("dateTime") String dateTime,
                        org.springframework.data.domain.Pageable pageable);

        @Query("SELECT w FROM Word w WHERE w.language = :language AND w.isEnriched = true AND TO_CHAR(w.enrichedAt, 'YYYY-MM-DD HH24:MI') = :dateTime")
        List<Word> findByLanguageAndEnrichedAtPrecision(@Param("language") String language,
                        @Param("dateTime") String dateTime);

        List<Word> findByLanguageAndIsEnrichedTrueAndEnrichedAtBetween(String language, java.time.LocalDateTime start,
                        java.time.LocalDateTime end);

        @Query(value = "SELECT DISTINCT TO_CHAR(judge_approved_at, 'YYYY-MM-DD HH24:MI') FROM word WHERE language = :language AND judge_status = 'APPROVED' AND judge_approved_at IS NOT NULL ORDER BY 1 DESC", nativeQuery = true)
        List<String> findDistinctJudgeApprovedDates(@Param("language") String language);

        @Query("SELECT w FROM Word w WHERE w.language = :language AND w.judgeStatus = 'APPROVED' AND TO_CHAR(w.judgeApprovedAt, 'YYYY-MM-DD HH24:MI') = :dateTime")
        org.springframework.data.domain.Page<Word> findByLanguageAndJudgeApprovedAtPrecision(
                        @Param("language") String language, @Param("dateTime") String dateTime,
                        org.springframework.data.domain.Pageable pageable);

        @Query("SELECT w FROM Word w WHERE w.language = :language AND w.judgeStatus = 'APPROVED' AND TO_CHAR(w.judgeApprovedAt, 'YYYY-MM-DD HH24:MI') = :dateTime")
        List<Word> findByLanguageAndJudgeApprovedAtPrecision(@Param("language") String language,
                        @Param("dateTime") String dateTime);

        @Query("SELECT w FROM Word w WHERE w.isEnriched = true AND (w.needsReEnrichment = false OR w.needsReEnrichment IS NULL) AND (w.isVerified = false OR w.isVerified IS NULL) ORDER BY w.enrichedAt ASC LIMIT :limit")
        List<Word> findTopEnrichedWords(@Param("limit") int limit);

        @Query("SELECT w FROM Word w WHERE w.status = 'PROCESSED' AND (w.isEnriched = false OR w.isEnriched IS NULL) AND w.rootWord IS NULL AND w.language = 'en' ORDER BY w.id ASC")
        List<Word> findPendingEnrichmentWithLimit(org.springframework.data.domain.Pageable pageable);

        @Query("SELECT w FROM Word w WHERE w.status = 'PROCESSED' AND (w.isEnriched = false OR w.isEnriched IS NULL) AND w.rootWord IS NULL AND w.difficulty IS NOT NULL ORDER BY w.id ASC")
        List<Word> findPendingTrustedEnrichment(org.springframework.data.domain.Pageable pageable);

        List<Word> findByJudgeStatus(String judgeStatus);

        @Query("SELECT COUNT(w) FROM Word w WHERE w.judgeStatus = 'PENDING_REVIEW'")
        int countJudgePending();

        // ======= MEDIA-TARGETED QUERIES =======

        @Query("SELECT mw.word FROM MediaWord mw WHERE mw.media.id = :mediaId AND mw.word.isEnriched = true AND (mw.word.needsReEnrichment = false OR mw.word.needsReEnrichment IS NULL) AND (mw.word.isVerified = false OR mw.word.isVerified IS NULL) ORDER BY mw.word.enrichedAt ASC LIMIT :limit")
        List<Word> findTopEnrichedWordsByMediaId(@Param("mediaId") Long mediaId, @Param("limit") int limit);

        @Query("SELECT mw.word FROM MediaWord mw WHERE mw.media.id = :mediaId AND mw.word.difficulty IN :levels")
        List<Word> findByMediaIdAndDifficultyIn(@Param("mediaId") Long mediaId, @Param("levels") List<String> levels);

        @Query("SELECT mw.word FROM MediaWord mw WHERE mw.media.id = :mediaId AND mw.word.isEnriched = true AND mw.word.needsReEnrichment = true ORDER BY mw.word.id ASC")
        List<Word> findByMediaIdAndNeedsReEnrichmentTrue(@Param("mediaId") Long mediaId);

        @Modifying
        @Query("UPDATE Word w SET w.definition = NULL, w.isEnriched = false, w.enrichedAt = NULL, w.judgeVerdict = NULL, w.judgeStatus = NULL, w.judgeApprovedAt = NULL, w.auditNotes = NULL WHERE w.language = :language")
        void clearAllTranslations(@Param("language") String language);

        @Query("SELECT COUNT(w) FROM Word w WHERE (w.status = 'PENDING' OR (w.status = 'FAILED' AND w.retryCount < 3)) AND w.language = :language")
        long countPendingAnalysis(@Param("language") String language);

        @Query("SELECT COUNT(w) FROM Word w WHERE w.status = 'PROCESSED' AND (w.isEnriched = false OR w.isEnriched IS NULL) AND w.rootWord IS NULL AND w.language = :language")
        long countPendingEnrichment(@Param("language") String language);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query(value = "UPDATE word w SET global_frequency = (SELECT COALESCE(SUM(mw.count), 0) FROM media_word mw WHERE mw.word_id = w.id)", nativeQuery = true)
    void updateGlobalFrequencies();

    @Query("SELECT w FROM Word w WHERE w.language = :language AND w.globalFrequency > 0 " +
           "AND (:applyDifficultyFilter = false OR w.difficulty IN :difficulties) " +
           "AND (:onlyUnknown = false OR :userId IS NULL OR NOT EXISTS (SELECT 1 FROM UserKnownWord ukw WHERE ukw.word.id = w.id AND ukw.user.id = :userId)) " +
           "AND (w.isProperNoun IS NULL OR w.isProperNoun = false) " +
           "ORDER BY w.globalFrequency DESC")
    List<Word> findTopFrequentWords(@Param("language") String language, 
                                     @Param("difficulties") java.util.List<String> difficulties, 
                                     @Param("applyDifficultyFilter") boolean applyDifficultyFilter,
                                     @Param("onlyUnknown") boolean onlyUnknown,
                                     @Param("userId") Long userId,
                                     org.springframework.data.domain.Pageable pageable);

    @Query("SELECT w FROM Word w WHERE w.language = 'en' AND w.isEnriched = true AND (w.problemFound = false OR w.problemFound IS NULL) ORDER BY w.id ASC")
    List<Word> findWordsForAuditing(org.springframework.data.domain.Pageable pageable);

    // ======= AUDIT STATS QUERIES =======
    @Query("SELECT COUNT(w) FROM Word w WHERE w.isEnriched = true")
    long countEnriched();

    @Query("SELECT COUNT(w) FROM Word w WHERE w.problemFound = true")
    long countProblems();

    @Query("SELECT COUNT(w) FROM Word w WHERE w.isEnriched = true AND w.isVerified = true AND w.problemFound = false")
    long countAuditedClean();
}
