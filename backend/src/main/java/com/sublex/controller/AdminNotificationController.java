package com.sublex.controller;

import com.sublex.dto.BroadcastRequest;
import com.sublex.service.PushNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Admin-only push tools. Guarded by SecurityConfig ("/api/admin/**" → ROLE_ADMIN).
 * Surfaced in the web admin dashboard for engagement campaigns.
 */
@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
public class AdminNotificationController {

    private final PushNotificationService pushNotificationService;

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
