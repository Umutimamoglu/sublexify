package com.sublex.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_known_word", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "word_id"})
}, indexes = {
    @Index(name = "idx_ukw_user_id", columnList = "user_id"),
    @Index(name = "idx_ukw_word_id", columnList = "word_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserKnownWord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private Word word;

    @CreationTimestamp
    @Column(name = "marked_at", nullable = false, updatable = false)
    private LocalDateTime markedAt;
}
