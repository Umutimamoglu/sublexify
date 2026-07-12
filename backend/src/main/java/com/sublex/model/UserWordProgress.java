package com.sublex.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_word_progress", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "word_id"})
}, indexes = {
    @Index(name = "idx_uwp_user_id", columnList = "user_id"),
    @Index(name = "idx_uwp_word_id", columnList = "word_id"),
    @Index(name = "idx_uwp_next_review", columnList = "next_review_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserWordProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private Word word;

    @Builder.Default
    @Column(name = "review_count", nullable = false)
    private int reviewCount = 0;

    @Builder.Default
    @Column(name = "success_count", nullable = false)
    private int successCount = 0;

    @Column(name = "next_review_date")
    private LocalDateTime nextReviewDate;

    @UpdateTimestamp
    @Column(name = "last_review_date")
    private LocalDateTime lastReviewDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
