package com.sublex.security;

import com.sublex.model.AuthProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Verifies a social provider's token server-side and returns the trusted
 * identity. Never trust anything the client sends except the raw token — the
 * email/sub/name we use come from the provider's own verification response.
 *
 * <p>Phase order: GOOGLE now; APPLE / FACEBOOK slot in here next.
 */
@Slf4j
@Component
public class SocialTokenVerifier {

    /** Trusted identity extracted from a verified provider token. */
    public record VerifiedSocialUser(String providerId, String email, boolean emailVerified, String name) {}

    private static final String GOOGLE_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo";

    /** Comma-separated Google OAuth client IDs we accept as the token audience. */
    private final Set<String> googleClientIds;
    private final RestClient http = RestClient.create();

    public SocialTokenVerifier(
            @Value("${application.security.oauth.google.client-ids:}") String googleClientIds) {
        this.googleClientIds = Arrays.stream(googleClientIds.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    public VerifiedSocialUser verify(AuthProvider provider, String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Missing social token");
        }
        return switch (provider) {
            case GOOGLE -> verifyGoogle(token);
            case APPLE, FACEBOOK -> throw new UnsupportedOperationException(
                    provider + " sign-in is not configured yet");
            case LOCAL -> throw new IllegalArgumentException("LOCAL is not a social provider");
        };
    }

    // ─── Google ──────────────────────────────────────────────────────────────
    // Validates the ID token via Google's tokeninfo endpoint, then checks the
    // audience against our own client IDs so a token minted for another app is
    // rejected. (For higher volume this can move to local JWKS verification.)
    @SuppressWarnings("unchecked")
    private VerifiedSocialUser verifyGoogle(String idToken) {
        if (googleClientIds.isEmpty()) {
            throw new IllegalStateException("Google sign-in not configured (no client IDs)");
        }

        Map<String, Object> claims;
        try {
            claims = http.get()
                    .uri(GOOGLE_TOKENINFO + "?id_token={t}", idToken)
                    .retrieve()
                    .body(Map.class);
        } catch (Exception e) {
            log.warn("Google tokeninfo rejected token: {}", e.getMessage());
            throw new IllegalArgumentException("Invalid Google token");
        }
        if (claims == null) throw new IllegalArgumentException("Invalid Google token");

        String aud = String.valueOf(claims.get("aud"));
        if (!googleClientIds.contains(aud)) {
            log.warn("Google token audience '{}' not in allowed client IDs", aud);
            throw new IllegalArgumentException("Token audience not allowed");
        }

        String iss = String.valueOf(claims.get("iss"));
        if (!List.of("accounts.google.com", "https://accounts.google.com").contains(iss)) {
            throw new IllegalArgumentException("Invalid token issuer");
        }

        String sub = String.valueOf(claims.get("sub"));
        String email = claims.get("email") != null ? String.valueOf(claims.get("email")) : null;
        boolean emailVerified = "true".equalsIgnoreCase(String.valueOf(claims.get("email_verified")));
        String name = claims.get("name") != null ? String.valueOf(claims.get("name")) : null;

        return new VerifiedSocialUser(sub, email, emailVerified, name);
    }
}
