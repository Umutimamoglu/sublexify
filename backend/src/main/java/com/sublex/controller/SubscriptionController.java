package com.sublex.controller;

import com.sublex.dto.MembershipDTO;
import com.sublex.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Current user's membership detail for the profile screen. Requires auth
 * (falls under SecurityConfig's anyRequest().authenticated()).
 */
@RestController
@RequestMapping("/api/subscription")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    @GetMapping("/me")
    @Operation(summary = "Current user's membership detail (days left, source, lifetime)")
    public ResponseEntity<MembershipDTO> myMembership(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(subscriptionService.getMembership(userId));
    }
}
