package com.sublex.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "media_word", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"media_id", "word_id"})
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MediaWord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "media_id", nullable = false)
    private Media media;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id", nullable = false)
    private Word word;

    @Column(nullable = false)
    private Integer count;
}
