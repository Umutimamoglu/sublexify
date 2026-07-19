package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Resolved entitlement snapshot for a user. Returned in app-init so the client
 * refreshes premium status on cold start without a separate /auth/me round-trip.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EntitlementDTO {
    private String plan;                 // "FREE" | "PREMIUM"
    private Boolean isPremium;
    private LocalDateTime premiumUntil;
    private List<String> features;
}
