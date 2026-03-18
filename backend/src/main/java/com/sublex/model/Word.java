package com.sublex.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

import lombok.Builder;

@Entity
@Table(name = "word", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "word", "language" })
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Word {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String word;

    @Column(nullable = false)
    @Builder.Default
    private String language = "en";

    // AI Enrichment Fields
    @Column(length = 10)
    private String difficulty; // e.g., "A1", "C2"

    @Column(name = "is_enriched")
    @Builder.Default
    private Boolean isEnriched = false;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private WordDefinition definition;

    @Column(name = "enriched_at")
    private LocalDateTime enrichedAt;

    @Column(name = "needs_re_enrichment")
    @Builder.Default
    private Boolean needsReEnrichment = false;

    @Column(name = "is_verified")
    @Builder.Default
    private Boolean isVerified = false;

    @Column(name = "judge_approved_at")
    private LocalDateTime judgeApprovedAt;

    @Column(name = "audit_notes", columnDefinition = "text")
    private String auditNotes;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "judge_verdict", columnDefinition = "jsonb")
    private WordDefinition judgeVerdict;

    @Column(name = "judge_status", length = 20)
    private String judgeStatus; // null, PENDING_REVIEW, APPROVED, REJECTED

    // Async Pipeline Fields
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "root_word_id")
    private Word rootWord;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "PENDING"; // PENDING, PROCESSED, FAILED

    @Column(name = "retry_count")
    @Builder.Default
    private Integer retryCount = 0;

    @Column(name = "is_proper_noun")
    private Boolean isProperNoun;

    @Column(name = "context_sentence", columnDefinition = "text")
    private String contextSentence;

    @Column(name = "global_frequency")
    @Builder.Default
    private Integer globalFrequency = 0;

    @Column(name = "problem_found")
    @Builder.Default
    private Boolean problemFound = false;

    @Column(name = "step3_error", columnDefinition = "text")
    private String step3Error;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
