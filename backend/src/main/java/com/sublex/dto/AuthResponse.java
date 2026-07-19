package com.sublex.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private UserDTO user;

    @Data
    @AllArgsConstructor
    public static class UserDTO {
        private Long id;
        private String email;
        private String name;
        private String role;

        // Entitlement — the client checks `features` / `isPremium`, never derives its own gating.
        private String plan;                // effective plan: "FREE" | "PREMIUM"
        private Boolean isPremium;           // true only while premium is currently active
        private LocalDateTime premiumUntil;  // stored end date (may be past → then isPremium=false)
        private List<String> features;      // e.g. ["PREMIUM_CONTENT","BACKGROUND_PLAYBACK","LIST_EXPORT"]
    }
}
