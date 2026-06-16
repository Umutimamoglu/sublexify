package com.sublex.controller;

import com.sublex.dto.AdminUserDTO;
import com.sublex.dto.BroadcastRequest;
import com.sublex.dto.SendToUserRequest;
import com.sublex.repository.DeviceTokenRepository;
import com.sublex.repository.UserRepository;
import com.sublex.service.PushNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Admin-only push tools. Guarded by SecurityConfig ("/api/admin/**" → ROLE_ADMIN).
 * Surfaced in the web admin dashboard for engagement campaigns.
 */
@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
public class AdminNotificationController {

    private final PushNotificationService pushNotificationService;
    private final UserRepository userRepository;
    private final DeviceTokenRepository deviceTokenRepository;

    /** GET /api/admin/notifications/recipients — users with their enabled-device count, for the picker. */
    @GetMapping("/recipients")
    public ResponseEntity<List<AdminUserDTO>> recipients() {
        Map<Long, Long> deviceCounts = deviceTokenRepository.findByEnabledTrue().stream()
                .collect(Collectors.groupingBy(t -> t.getUser().getId(), Collectors.counting()));

        List<AdminUserDTO> users = userRepository.findAll().stream()
                .map(u -> new AdminUserDTO(u.getId(), u.getName(), u.getEmail(),
                        deviceCounts.getOrDefault(u.getId(), 0L)))
                .toList();
        return ResponseEntity.ok(users);
    }

    /** POST /api/admin/notifications/send — push to a single user. */
    @PostMapping("/send")
    public ResponseEntity<Void> sendToUser(@RequestBody SendToUserRequest request) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "admin_direct");
        if (request.url() != null && !request.url().isBlank()) {
            data.put("url", request.url());
        }
        pushNotificationService.sendToUser(request.userId(), request.title(), request.body(), data, request.imageUrl());
        return ResponseEntity.accepted().build();
    }

    /** POST /api/admin/notifications/broadcast — send a push to every enabled device. */
    @PostMapping("/broadcast")
    public ResponseEntity<Void> broadcast(@RequestBody BroadcastRequest request) {
        Map<String, String> data = new HashMap<>();
        data.put("type", "admin_broadcast");
        if (request.url() != null && !request.url().isBlank()) {
            data.put("url", request.url());
        }
        pushNotificationService.broadcastToAll(request.title(), request.body(), data, request.imageUrl());
        return ResponseEntity.accepted().build();
    }
}
