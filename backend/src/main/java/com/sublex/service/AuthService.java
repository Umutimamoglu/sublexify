package com.sublex.service;

import com.sublex.dto.AuthRequest;
import com.sublex.dto.AuthResponse;
import com.sublex.model.Role;
import com.sublex.model.User;
import com.sublex.repository.UserRepository;
import com.sublex.security.JwtUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

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

    private AuthResponse.UserDTO toUserDTO(User user) {
        return new AuthResponse.UserDTO(
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name()
        );
    }
}
