package com.sublex.service;

import com.sublex.model.DeviceToken;
import com.sublex.model.User;
import com.sublex.repository.DeviceTokenRepository;
import com.sublex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    /** Remove a token (e.g. on logout or when notifications are disabled). */
    @Transactional
    public void removeToken(String token) {
        deviceTokenRepository.deleteByToken(token);
    }
}
