package com.sublex.service;

import com.sublex.dto.AuthRequest;
import com.sublex.dto.AuthResponse;
import com.sublex.model.PasswordResetToken;
import com.sublex.model.Role;
import com.sublex.model.User;
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
        return new AuthResponse.UserDTO(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name()
        );
    }
}
