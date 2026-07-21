package com.sublex.repository;

import com.sublex.model.AuthProvider;
import com.sublex.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /** Social sign-in lookup (e.g. Apple, which may hide the email after first auth). */
    Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId);

    /** Admin user search by email or name (case-insensitive), capped via Pageable. */
    List<User> findByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(
            String email, String name, Pageable pageable);
}
