package com.sublex.repository;

import com.sublex.model.UserListPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserListPreferenceRepository extends JpaRepository<UserListPreference, Long> {
    
    List<UserListPreference> findByUserId(Long userId);
    
    Optional<UserListPreference> findByUserIdAndWordListId(Long userId, Long wordListId);
    
    @Query("SELECT p.wordList.id FROM UserListPreference p WHERE p.user.id = :userId AND p.isHidden = true")
    List<Long> findHiddenListIdsByUserId(Long userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserListPreference p WHERE p.user.id = :userId")
    void deleteAllByUserId(Long userId);
}
