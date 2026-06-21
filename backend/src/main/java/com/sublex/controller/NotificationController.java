package com.sublex.controller;

import com.sublex.dto.NotificationDTO;
import com.sublex.repository.NotificationRepository;
import com.sublex.service.DeviceTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Endpoints for the user's notification inbox and push toggle.
 */
@RestController
@RequestMapping("/api/user/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final DeviceTokenService deviceTokenService;

    /** GET /api/user/notifications — list the last 50 notifications for the caller. */
    @GetMapping
    public ResponseEntity<List<NotificationDTO>> list(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        List<NotificationDTO> dtos = notificationRepository
                .findTop50ByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(n -> new NotificationDTO(
                        n.getId(), n.getTitle(), n.getBody(),
                        n.getType(), n.getUrl(), n.getImageUrl(),
                        n.isRead(), n.getCreatedAt()))
                .toList();
        return ResponseEntity.ok(dtos);
    }

    /** GET /api/user/notifications/unread-count */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        long count = notificationRepository.countByUserIdAndReadFalse(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    /** POST /api/user/notifications/mark-read — mark all as read. */
    @Transactional
    @PostMapping("/mark-read")
    public ResponseEntity<Void> markAllRead(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        notificationRepository.markAllRead(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * PUT /api/user/notifications/push-enabled
     * Body: { "enabled": true|false }
     * Toggle whether push is delivered to this user's devices (without removing tokens).
     */
    @PutMapping("/push-enabled")
    public ResponseEntity<Map<String, Boolean>> setPushEnabled(
            @RequestBody Map<String, Boolean> body,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
        deviceTokenService.setPushEnabled(userId, enabled);
        return ResponseEntity.ok(Map.of("pushEnabled", enabled));
    }

    /** GET /api/user/notifications/push-enabled — check current push state. */
    @GetMapping("/push-enabled")
    public ResponseEntity<Map<String, Boolean>> getPushEnabled(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        boolean enabled = deviceTokenService.isPushEnabled(userId);
        return ResponseEntity.ok(Map.of("pushEnabled", enabled));
    }
}
