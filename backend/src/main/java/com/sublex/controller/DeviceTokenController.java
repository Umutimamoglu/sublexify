package com.sublex.controller;

import com.sublex.dto.DeviceTokenRequest;
import com.sublex.service.DeviceTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user/device-token")
@RequiredArgsConstructor
public class DeviceTokenController {

    private final DeviceTokenService deviceTokenService;

    /** PUT /api/user/device-token — register/refresh the caller's FCM token. */
    @PutMapping
    public ResponseEntity<Void> register(@RequestBody DeviceTokenRequest request,
                                         Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        deviceTokenService.upsertToken(userId, request.token(), request.platform());
        return ResponseEntity.noContent().build();
    }

    /** DELETE /api/user/device-token — unregister a token (logout / disabled). */
    @DeleteMapping
    public ResponseEntity<Void> unregister(@RequestBody DeviceTokenRequest request) {
        deviceTokenService.removeToken(request.token());
        return ResponseEntity.noContent().build();
    }
}
