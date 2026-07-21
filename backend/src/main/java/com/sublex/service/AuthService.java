package com.sublex.service;

import com.sublex.dto.AuthRequest;
import com.sublex.dto.AuthResponse;
import com.sublex.dto.SocialAuthRequest;
import com.sublex.model.AuthProvider;
import com.sublex.model.PasswordResetToken;
import com.sublex.model.Plan;
import com.sublex.model.Role;
import com.sublex.model.User;
import com.sublex.security.SocialTokenVerifier;
import com.sublex.repository.PasswordResetTokenRepository;
import com.sublex.repository.UserRepository;
import com.sublex.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;
    private final EntitlementService entitlementService;
    private final SocialTokenVerifier socialTokenVerifier;

    public AuthResponse register(AuthRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email is already registered");
        }

        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName());
        user.setRole(Role.USER);

        user = userRepository.save(user);

        String token = jwtUtils.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        return new AuthResponse(token, toUserDTO(user));
    }

    public AuthResponse login(AuthRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }

        String token = jwtUtils.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        return new AuthResponse(token, toUserDTO(user));
    }

    /**
     * Social sign-in. Verifies the provider token server-side, then finds or
     * creates the local user:
     *   1. match on (provider, providerId) — the stable link;
     *   2. else match on a verified email and attach the provider to it;
     *   3. else create a fresh social user (random, unusable password).
     * Fails closed: an unverified/invalid token never yields a session.
     */
    @Transactional
    public AuthResponse socialLogin(SocialAuthRequest request) {
        AuthProvider provider;
        try {
            provider = AuthProvider.valueOf(String.valueOf(request.getProvider()).trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Unsupported provider");
        }
        if (provider == AuthProvider.LOCAL) {
            throw new RuntimeException("Unsupported provider");
        }

        SocialTokenVerifier.VerifiedSocialUser verified =
                socialTokenVerifier.verify(provider, request.getToken());

        // 1) Existing link by (provider, providerId)
        User user = userRepository.findByProviderAndProviderId(provider, verified.providerId())
                .orElse(null);

        if (user == null) {
            String email = verified.email() != null ? verified.email().trim().toLowerCase() : null;

            // 2) Attach provider to an existing account with the same verified email
            if (email != null && verified.emailVerified()) {
                user = userRepository.findByEmail(email).orElse(null);
                if (user != null) {
                    user.setProvider(provider);
                    user.setProviderId(verified.providerId());
                }
            }

            // 3) Brand-new social user
            if (user == null) {
                if (email == null) {
                    // No stable email to key on (e.g. Apple private relay withheld) —
                    // synthesize a unique placeholder so the unique constraint holds.
                    email = provider.name().toLowerCase() + "_" + verified.providerId() + "@social.sublex";
                }
                user = new User();
                user.setEmail(email);
                user.setPassword(passwordEncoder.encode("social:" + java.util.UUID.randomUUID()));
                user.setName(verified.name() != null ? verified.name() : request.getName());
                user.setRole(Role.USER);
                user.setProvider(provider);
                user.setProviderId(verified.providerId());
            }

            user = userRepository.save(user);
            log.info("Social sign-in ({}): user {} ({})", provider, user.getId(), user.getEmail());
        }

        String token = jwtUtils.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(token, toUserDTO(user));
    }

    public AuthResponse.UserDTO getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return toUserDTO(user);
    }

    @Transactional
    public void deleteAccount(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new RuntimeException("User not found");
        }
        userRepository.deleteById(userId);
    }

    // ─── Password Reset ────────────────────────────────────────────────────────

    @Transactional
    public void forgotPassword(String email) {
        // Always return success — never reveal whether an email exists
        userRepository.findByEmail(email).ifPresent(user -> {
            // Remove any existing tokens for this user
            passwordResetTokenRepository.deleteByUserId(user.getId());

            // Generate 6-digit OTP
            String code = String.format("%06d", new SecureRandom().nextInt(1_000_000));

            PasswordResetToken token = PasswordResetToken.builder()
                    .code(code)
                    .user(user)
                    .expiresAt(LocalDateTime.now().plusMinutes(15))
                    .used(false)
                    .build();

            passwordResetTokenRepository.save(token);

            // Send email asynchronously
            emailService.sendPasswordResetEmail(user.getEmail(), code);
            log.info("Password reset code generated for user {}", user.getId());
        });
    }

    @Transactional
    public AuthResponse resetPassword(String code, String newPassword) {
        PasswordResetToken token = passwordResetTokenRepository
                .findByCodeAndUsedFalse(code)
                .orElseThrow(() -> new RuntimeException("Invalid or expired code"));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Code has expired");
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark token as used
        token.setUsed(true);
        passwordResetTokenRepository.save(token);

        log.info("Password successfully reset for user {}", user.getId());

        // Return a fresh JWT so the user is immediately logged in
        String jwt = jwtUtils.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(jwt, toUserDTO(user));
    }

    private AuthResponse.UserDTO toUserDTO(User user) {
        boolean premiumActive = user.isPremiumActive();
        Plan effectivePlan = premiumActive ? user.getPlan() : Plan.FREE;
        java.util.List<String> features = entitlementService.featuresForPlan(effectivePlan).stream()
                .map(Enum::name)
                .toList();

        return new AuthResponse.UserDTO(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name(),
                effectivePlan.name(),
                premiumActive,
                user.getPremiumUntil(),
                features
        );
    }
}
