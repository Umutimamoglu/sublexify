package com.sublex.repository;

import com.sublex.model.Media;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaRepository extends JpaRepository<Media, Long> {
    
    List<Media> findByLanguage(String language);
    
    List<Media> findByType(Media.MediaType type);
}
