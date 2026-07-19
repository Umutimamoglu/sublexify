package com.sublex.controller;

import com.sublex.dto.AdminPremiumUserDTO;
import com.sublex.dto.SubscriptionDTO;
import com.sublex.model.Media;
import com.sublex.model.User;
import com.sublex.repository.MediaRepository;
import com.sublex.repository.UserRepository;
import com.sublex.service.SubscriptionService;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Admin premium controls. Path is under {@code /api/admin/**} which SecurityConfig
 * already restricts to ROLE_ADMIN. Phase 1: content flagging + manual grants.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminPremiumController {

    private static final int USER_SEARCH_LIMIT = 50;

    private final MediaRepository mediaRepository;
    private final UserRepository userRepository;
    private final SubscriptionService subscriptionService;

    // ─── Content flagging ────────────────────────────────────────────────────

    /** Toggle premium on a single media row (a movie or one episode). */
    @PatchMapping("/media/{id}/premium")
    @Operation(summary = "Mark a single media as premium (or free)")
    @Transactional
    public ResponseEntity<Map<String, Object>> setMediaPremium(
            @PathVariable Long id,
            @RequestParam boolean value) {
        Media media = mediaRepository.findById(id).orElse(null);
        if (media == null) return ResponseEntity.notFound().build();
        media.setPremium(value);
        mediaRepository.save(media);
        log.info("Media {} premium set to {}", id, value);
        return ResponseEntity.ok(Map.of("id", id, "isPremium", value));
    }

    /** Toggle premium for an entire series (all episodes sharing the imdbId). */
    @PatchMapping("/media/series/{imdbId}/premium")
    @Operation(summary = "Mark a whole series (all its episodes) as premium (or free)")
    @Transactional
    public ResponseEntity<Map<String, Object>> setSeriesPremium(
            @PathVariable String imdbId,
            @RequestParam boolean value) {
        int updated = mediaRepository.updatePremiumByImdbId(imdbId, value);
        log.info("Series {} premium set to {} ({} rows)", imdbId, value, updated);
        return ResponseEntity.ok(Map.of("imdbId", imdbId, "isPremium", value, "updated", updated));
    }

    // ─── User entitlement management ─────────────────────────────────────────

    /** Search users by email/name for the premium admin panel. */
    @GetMapping("/users")
    @Operation(summary = "Search users (email/name) with their premium status")
    public ResponseEntity<List<AdminPremiumUserDTO>> searchUsers(
            @RequestParam(required = false, defaultValue = "") String search) {
        PageRequest page = PageRequest.of(0, USER_SEARCH_LIMIT);
        List<User> users = search.isBlank()
                ? userRepository.findAll(page).getContent()
                : userRepository.findByEmailContainingIgnoreCaseOrNameContainingIgnoreCase(search, search, page);
        return ResponseEntity.ok(users.stream().map(AdminPremiumUserDTO::from).toList());
    }

    /** Grant premium to a user. Body: {days?: number, lifetime?: boolean, note?: string}. */
    @PostMapping("/users/{id}/premium")
    @Operation(summary = "Grant premium to a user (manual, no payment)")
    public ResponseEntity<AdminPremiumUserDTO> grantPremium(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();

        Map<String, Object> b = body != null ? body : Map.of();
        int days = b.get("days") instanceof Number n ? n.intValue() : 0;
        boolean lifetime = Boolean.TRUE.equals(b.get("lifetime"));
        String note = b.get("note") instanceof String s ? s : null;

        subscriptionService.grantManual(id, days, lifetime, note);
        User updated = userRepository.findById(id).orElseThrow();
        return ResponseEntity.ok(AdminPremiumUserDTO.from(updated));
    }

    /** Revoke premium from a user immediately. */
    @DeleteMapping("/users/{id}/premium")
    @Operation(summary = "Revoke a user's premium immediately")
    public ResponseEntity<AdminPremiumUserDTO> revokePremium(@PathVariable Long id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        subscriptionService.revoke(id);
        User updated = userRepository.findById(id).orElseThrow();
        return ResponseEntity.ok(AdminPremiumUserDTO.from(updated));
    }

    /** Full subscription history for a user. */
    @GetMapping("/users/{id}/subscriptions")
    @Operation(summary = "List a user's subscription history")
    public ResponseEntity<List<SubscriptionDTO>> userSubscriptions(@PathVariable Long id) {
        if (!userRepository.existsById(id)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(
                subscriptionService.getHistory(id).stream().map(SubscriptionDTO::from).toList());
    }
}
