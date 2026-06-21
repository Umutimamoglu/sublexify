package com.sublex.repository;

import com.sublex.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    /** Get the most recent 50 notifications for a user, newest first. */
    List<Notification> findTop50ByUserIdOrderByCreatedAtDesc(Long userId);

    /** Count unread notifications for a user. */
    long countByUserIdAndReadFalse(Long userId);

    /** Mark all notifications for a user as read. */
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    int markAllRead(@Param("userId") Long userId);
}
