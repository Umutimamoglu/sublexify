package com.sublex.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_word_notes", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "word_id"})
}, indexes = {
    @Index(name = "idx_uwn_user_id", columnList = "user_id"),
    @Index(name = "idx_uwn_word_id", columnList = "word_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class UserWordNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private Word word;

    @Column(name = "note", nullable = false, columnDefinition = "TEXT")
    private String note;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
