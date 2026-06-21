package com.sublex.service;

import com.google.firebase.messaging.*;
import com.sublex.config.FirebaseConfig;
import com.sublex.model.DeviceToken;
import com.sublex.model.User;
import com.sublex.repository.DeviceTokenRepository;
import com.sublex.repository.NotificationRepository;
import com.sublex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Sends FCM push notifications. All public methods are async and fail-soft:
 * if Firebase is not configured they simply log and return.
 * Every sendToUser call is also persisted in the notifications table.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    /** FCM multicast hard limit per request. */
    private static final int BATCH_SIZE = 500;

    private final FirebaseConfig firebaseConfig;
    private final DeviceTokenRepository deviceTokenRepository;
    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Send to every enabled device of a single user, and record in notification history.
     * If the user has disabled push (all tokens disabled), the notification is still saved to DB.
     */
    @Async
    public void sendToUser(Long userId, String title, String body, Map<String, String> data, String imageUrl) {
        // Always record in notification history regardless of push state
        userRepository.findById(userId).ifPresent(user ->
            saveNotification(user, title, body, data, imageUrl)
        );

        if (!ensureEnabled()) return;

        List<DeviceToken> tokens = deviceTokenRepository.findByUserIdAndEnabledTrue(userId);
        if (tokens.isEmpty()) {
            log.debug("No enabled device tokens for user {}, skipping push.", userId);
            return;
        }
        send(tokens, title, body, data, imageUrl);
    }

    /** Broadcast to every enabled device in the app (admin engagement pushes). */
    @Async
    public void broadcastToAll(String title, String body, Map<String, String> data, String imageUrl) {
        if (!ensureEnabled()) return;
        List<DeviceToken> tokens = deviceTokenRepository.findByEnabledTrue();
        if (tokens.isEmpty()) {
            log.info("Broadcast requested but there are no device tokens.");
            return;
        }
        log.info("Broadcasting push to {} devices.", tokens.size());
        send(tokens, title, body, data, imageUrl);
    }

    // ─── private helpers ──────────────────────────────────────────────────────

    private void saveNotification(User user, String title, String body,
                                   Map<String, String> data, String imageUrl) {
        try {
            com.sublex.model.Notification n = new com.sublex.model.Notification();
            n.setUser(user);
            n.setTitle(title);
            n.setBody(body);
            n.setImageUrl(imageUrl);
            if (data != null) {
                n.setType(data.get("type"));
                n.setUrl(data.get("url"));
            }
            notificationRepository.save(n);
        } catch (Exception e) {
            log.warn("Failed to persist notification for user {}: {}", user.getId(), e.getMessage());
        }
    }

    private void send(List<DeviceToken> tokens, String title, String body,
                      Map<String, String> data, String imageUrl) {
        List<DeviceToken> invalid = new ArrayList<>();

        for (int start = 0; start < tokens.size(); start += BATCH_SIZE) {
            List<DeviceToken> chunk = tokens.subList(start, Math.min(start + BATCH_SIZE, tokens.size()));
            List<String> tokenStrings = chunk.stream().map(DeviceToken::getToken).toList();

            MulticastMessage message = MulticastMessage.builder()
                    .addAllTokens(tokenStrings)
                    .setNotification(buildFcmNotification(title, body, imageUrl))
                    .putAllData(data == null ? Map.of() : data)
                    .setAndroidConfig(androidConfig())
                    .setApnsConfig(apnsConfig())
                    .build();

            try {
                BatchResponse response = FirebaseMessaging.getInstance().sendEachForMulticast(message);
                collectInvalidTokens(response, chunk, invalid);
                log.info("Push batch sent: {} ok, {} failed.", response.getSuccessCount(), response.getFailureCount());
            } catch (FirebaseMessagingException e) {
                log.error("Push batch failed entirely: {}", e.getMessage());
            }
        }

        if (!invalid.isEmpty()) {
            deviceTokenRepository.deleteAll(invalid);
            log.info("Removed {} invalid/stale device tokens.", invalid.size());
        }
    }

    private void collectInvalidTokens(BatchResponse response, List<DeviceToken> chunk, List<DeviceToken> invalid) {
        List<SendResponse> responses = response.getResponses();
        for (int i = 0; i < responses.size(); i++) {
            SendResponse r = responses.get(i);
            if (r.isSuccessful()) continue;
            MessagingErrorCode code = r.getException() != null ? r.getException().getMessagingErrorCode() : null;
            if (code == MessagingErrorCode.UNREGISTERED || code == MessagingErrorCode.INVALID_ARGUMENT) {
                invalid.add(chunk.get(i));
            }
        }
    }

    private Notification buildFcmNotification(String title, String body, String imageUrl) {
        Notification.Builder builder = Notification.builder().setTitle(title).setBody(body);
        if (imageUrl != null && !imageUrl.isBlank()) {
            builder.setImage(imageUrl);
        }
        return builder.build();
    }

    private AndroidConfig androidConfig() {
        return AndroidConfig.builder()
                .setPriority(AndroidConfig.Priority.HIGH)
                .setNotification(AndroidNotification.builder()
                        .setChannelId("defaultch")
                        .setSound("default")
                        .build())
                .build();
    }

    private ApnsConfig apnsConfig() {
        return ApnsConfig.builder()
                .setAps(Aps.builder().setSound("default").build())
                .build();
    }

    private boolean ensureEnabled() {
        if (!firebaseConfig.isInitialized()) {
            log.warn("Push requested but Firebase is not initialized — skipping.");
            return false;
        }
        return true;
    }
}
