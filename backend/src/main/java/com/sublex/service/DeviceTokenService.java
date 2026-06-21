package com.sublex.service;

import com.sublex.model.DeviceToken;
import com.sublex.model.User;
import com.sublex.repository.DeviceTokenRepository;
import com.sublex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DeviceTokenService {

    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;

    /** Register or refresh a device token for the given user. */
    @Transactional
    public void upsertToken(Long userId, String token, String platform) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        DeviceToken entity = deviceTokenRepository.findByToken(token)
                .orElseGet(DeviceToken::new);

        entity.setUser(user);
        entity.setToken(token);
        entity.setPlatform(platform);
        entity.setEnabled(true);
        deviceTokenRepository.save(entity);
    }

    /** Remove a token (e.g. on logout). */
    @Transactional
    public void removeToken(String token) {
        deviceTokenRepository.deleteByToken(token);
    }

    /**
     * Soft-toggle push notifications for all of a user's devices.
     * The token is preserved so push can be re-enabled instantly without re-registration.
     *
     * @param userId the user
     * @param enabled true = receive pushes, false = suppress pushes
     */
    @Transactional
    public void setPushEnabled(Long userId, boolean enabled) {
        List<DeviceToken> tokens = deviceTokenRepository.findByUserId(userId);
        tokens.forEach(t -> t.setEnabled(enabled));
        deviceTokenRepository.saveAll(tokens);
    }

    /**
     * Returns true if the user has at least one device token with enabled=true.
     */
    @Transactional(readOnly = true)
    public boolean isPushEnabled(Long userId) {
        return !deviceTokenRepository.findByUserIdAndEnabledTrue(userId).isEmpty();
    }
}
