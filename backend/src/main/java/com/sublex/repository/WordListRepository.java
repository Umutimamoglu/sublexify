package com.sublex.repository;

import com.sublex.model.WordList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WordListRepository extends JpaRepository<WordList, Long> {
    List<WordList> findAllByUserId(Long userId);
}
