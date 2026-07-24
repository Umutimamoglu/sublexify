package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * User-facing membership detail for the profile screen. Derived server-side so
 * both clients just render it. Phase 1 only produces MANUAL memberships; the
 * shape already covers Phase 2 (paid / store / coupon, monthly / yearly).
 */

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MembershipDTO {
    @JsonProperty("isPremium")
    private boolean isPremium;
    private String plan;                 // "FREE" | "PREMIUM"

    private String source;               // provider enum name: MANUAL | STRIPE | APPLE | GOOGLE | null
    private String sourceLabel;          // human label, localized-agnostic key resolved on client if needed
    private String billingInterval;      // "MONTHLY" | "YEARLY" | null (Phase 2)

    private boolean lifetime;            // true → no expiry
    private LocalDateTime startedAt;
    private LocalDateTime premiumUntil;  // null when free/lifetime
    private Integer daysLeft;            // null when free or lifetime
    private String note;                 // admin note for MANUAL grants
}
