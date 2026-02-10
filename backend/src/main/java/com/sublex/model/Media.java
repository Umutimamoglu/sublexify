package com.sublex.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "media")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Media {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "imdb_id")
    private String imdbId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MediaType type;

    @Column(nullable = false)
    private String language = "en";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum MediaType {
        MOVIE,
        SEASON,
        EPISODE
    }
}
