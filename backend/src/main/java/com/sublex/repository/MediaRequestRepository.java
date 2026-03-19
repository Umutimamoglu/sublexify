package com.sublex.repository;

import com.sublex.model.MediaRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaRequestRepository extends JpaRepository<MediaRequest, Long> {
    List<MediaRequest> findAllByOrderByCreatedAtDesc();
}
