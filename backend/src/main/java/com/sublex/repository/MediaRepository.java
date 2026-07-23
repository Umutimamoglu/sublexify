package com.sublex.repository;

import com.sublex.model.Media;
import com.sublex.model.MediaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaRepository extends JpaRepository<Media, Long> {
    List<Media> findByLanguage(String language);

    /** Toggle premium for every row of a series (episodes share imdbId). */
    @Modifying
    @Query("update Media m set m.isPremium = :value where m.imdbId = :imdbId")
    int updatePremiumByImdbId(@Param("imdbId") String imdbId, @Param("value") boolean value);

    List<MediaProjection> findAllProjectedBy();

    List<Media> findByType(MediaType type);

    java.util.Optional<Media> findByImdbId(String imdbId);

    java.util.Optional<Media> findByTmdbId(Long tmdbId);

    java.util.Optional<Media> findByImdbIdAndSeasonNumberAndEpisodeNumber(String imdbId, Integer seasonNumber,
            Integer episodeNumber);

    List<Media> findByImdbIdAndTypeOrderBySeasonNumberAscEpisodeNumberAsc(String imdbId, MediaType type);

    @Query("""
        SELECT m FROM Media m 
        WHERE (
            (:type = 'ALL' AND (
                (m.type = 'MOVIE' AND (:search IS NULL OR :search = '' OR LOWER(m.title) LIKE LOWER(CONCAT('%', :search, '%'))))
                OR 
                (m.id IN (SELECT MIN(m2.id) FROM Media m2 WHERE m2.type = 'EPISODE' AND (:search IS NULL OR :search = '' OR LOWER(m2.title) LIKE LOWER(CONCAT('%', :search, '%'))) GROUP BY m2.tmdbId))
            ))
            OR (:type = 'MOVIE' AND m.type = 'MOVIE' AND (:search IS NULL OR :search = '' OR LOWER(m.title) LIKE LOWER(CONCAT('%', :search, '%'))))
            OR (:type = 'SERIES' AND m.id IN (SELECT MIN(m2.id) FROM Media m2 WHERE m2.type = 'EPISODE' AND (:search IS NULL OR :search = '' OR LOWER(m2.title) LIKE LOWER(CONCAT('%', :search, '%'))) GROUP BY m2.tmdbId))
        )
    """)
    org.springframework.data.domain.Page<MediaProjection> searchAndFilterMedia(
        @Param("search") String search, 
        @Param("type") String type, 
        org.springframework.data.domain.Pageable pageable
    );
}
