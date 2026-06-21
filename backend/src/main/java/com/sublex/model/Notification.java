package com.sublex.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * A push notification delivered to a specific user.
 * Stored so the user can view their notification history in the app.
 */
@Entity
@Table(name = "notifications", indexes = {
    @Index(name = "idx_notification_user", columnList = "user_id"),
    @Index(name = "idx_notification_created", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 1024)
    private String body;

    /** Notification type (e.g. "media_request_approved", "admin_direct"). */
    @Column(length = 64)
    private String type;

    /** Optional deep-link URL (e.g. "library"). */
    @Column(length = 512)
    private String url;

    /** Optional image URL. */
    @Column(length = 1024)
    private String imageUrl;

    /** Whether the user has read this notification. */
    @Column(nullable = false)
    private boolean read = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
