package com.sublex.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import lombok.EqualsAndHashCode;

@Entity
@Table(name = "word", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "word", "language" })
}, indexes = {
        @Index(name = "idx_word_word", columnList = "word"),
        @Index(name = "idx_word_language", columnList = "language"),
        @Index(name = "idx_word_difficulty", columnList = "difficulty"),
        @Index(name = "idx_word_status", columnList = "status"),
        @Index(name = "idx_word_is_enriched", columnList = "is_enriched"),
        @Index(name = "idx_word_global_frequency", columnList = "global_frequency")
})
@Getter
@Setter
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Word {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
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

    // AI Auditor v2 (Phase 2) — permanent per-word routing record. Internal/admin
    // only; deliberately NOT exposed in WordDTO, so it never reaches web/mobile.
    @Column(name = "audit_action", length = 20)
    private String auditAction; // DELETE | RE_ENRICH | SHORTEN | CLEAN | PROPER_NOUN

    @Column(name = "audited_at")
    private LocalDateTime auditedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
