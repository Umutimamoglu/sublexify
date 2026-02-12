package com.sublex.repository;

import com.sublex.model.Media;
import com.sublex.model.MediaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaRepository extends JpaRepository<Media, Long> {

    List<Media> findByLanguage(String language);

    List<Media> findByType(MediaType type);

    java.util.Optional<Media> findByImdbId(String imdbId);
}
