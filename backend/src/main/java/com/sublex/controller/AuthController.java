package com.sublex.controller;

import com.sublex.dto.AuthRequest;
import com.sublex.dto.AuthResponse;
import com.sublex.dto.SocialAuthRequest;
import com.sublex.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody AuthRequest request) {
        try {
            return ResponseEntity.ok(authService.register(request));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).build();
        }
    }

    @PostMapping("/social")
    public ResponseEntity<AuthResponse> social(@RequestBody SocialAuthRequest request) {
        try {
            return ResponseEntity.ok(authService.socialLogin(request));
        } catch (RuntimeException e) {
            // Fail-closed: any verification/config failure yields no session.
            return ResponseEntity.status(401).build();
        }
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse.UserDTO> me(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(authService.getCurrentUser(userId));
    }

    @DeleteMapping("/account")
    public ResponseEntity<Void> deleteAccount(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        authService.deleteAccount(userId);
        return ResponseEntity.noContent().build();
    }

    // ─── Password Reset ──────────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email gerekli"));
        }
        // Always return 200 — never reveal whether email exists (security best practice)
        authService.forgotPassword(email.trim().toLowerCase());
        return ResponseEntity.ok(Map.of("message", "Eğer bu email sistemde kayıtlıysa, sıfırlama kodu gönderildi."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        String newPassword = body.get("newPassword");

        if (code == null || code.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Kod ve yeni şifre gerekli"));
        }
        if (newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of("message", "Şifre en az 6 karakter olmalı"));
        }
        try {
            AuthResponse response = authService.resetPassword(code.trim(), newPassword);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", "Geçersiz veya süresi dolmuş kod"));
        }
    }
}
