package com.sublex.dto;

import lombok.Data;

/**
 * Social sign-in payload. {@code token} is the provider-issued credential the
 * server must verify (Google/Apple ID token, or Facebook access token).
 * {@code name} is an optional fallback (Apple only returns the name on the very
 * first authorization).
 */
@Data
public class SocialAuthRequest {
    private String provider; // "GOOGLE" | "APPLE" | "FACEBOOK"
    private String token;
    private String name;
}
