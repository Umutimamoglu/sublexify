package com.sublex.dto;

import com.sublex.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Safe user view for the premium admin panel — never exposes the password hash.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminPremiumUserDTO {
    private Long id;
    private String email;
    private String name;
    private String role;
    private String plan;
    private boolean isPremium;
    private LocalDateTime premiumUntil;
    private LocalDateTime premiumSince;
    private LocalDateTime createdAt;

    public static AdminPremiumUserDTO from(User u) {
        return new AdminPremiumUserDTO(
                u.getId(),
                u.getEmail(),
                u.getName(),
                u.getRole() != null ? u.getRole().name() : null,
                u.getPlan() != null ? u.getPlan().name() : "FREE",
                u.isPremiumActive(),
                u.getPremiumUntil(),
                u.getPremiumSince(),
                u.getCreatedAt());
    }
}
