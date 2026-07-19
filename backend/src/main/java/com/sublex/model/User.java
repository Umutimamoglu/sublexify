package com.sublex.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String name;

    @Enumerated(EnumType.STRING)
    private Role role;

    // ─── Premium / entitlement (denormalized fast-read; source of truth is subscriptions) ───

    @Enumerated(EnumType.STRING)
    @Column(columnDefinition = "varchar(20) not null default 'FREE'")
    private Plan plan = Plan.FREE;

    /** Premium is active while this is non-null and in the future. Null = no premium. */
    @Column(name = "premium_until")
    private LocalDateTime premiumUntil;

    @Column(name = "premium_since")
    private LocalDateTime premiumSince;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /** True when the user currently holds an active premium entitlement. */
    @Transient
    public boolean isPremiumActive() {
        return plan != Plan.FREE
                && premiumUntil != null
                && premiumUntil.isAfter(LocalDateTime.now());
    }
}
