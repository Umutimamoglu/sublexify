package com.sublex.repository;

import com.sublex.model.Subscription;
import com.sublex.model.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    /** Full history for a user, newest first. */
    List<Subscription> findByUserIdOrderByCreatedAtDesc(Long userId);

    /** Currently-active rows for a user (used when revoking / superseding). */
    List<Subscription> findByUserIdAndStatus(Long userId, SubscriptionStatus status);
}
