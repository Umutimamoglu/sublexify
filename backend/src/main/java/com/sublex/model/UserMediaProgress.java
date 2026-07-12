package com.sublex.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_media_progress", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "user_id", "media_id" })
}, indexes = {
        @Index(name = "idx_ump_user_id", columnList = "user_id"),
        @Index(name = "idx_ump_media_id", columnList = "media_id"),
        @Index(name = "idx_ump_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserMediaProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_id", nullable = false)
    private Media media;

    @UpdateTimestamp
    @Column(name = "last_accessed_at")
    private LocalDateTime lastAccessedAt;

    @Builder.Default
    @Column(nullable = false)
    private String status = "STARTED"; // STARTED, COMPLETED

    @Column(name = "percent_complete")
    private Double percentComplete;
}
