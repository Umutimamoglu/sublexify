package com.sublex.service;

import com.google.firebase.messaging.*;
import com.sublex.config.FirebaseConfig;
import com.sublex.model.DeviceToken;
import com.sublex.repository.DeviceTokenRepository;
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
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PushNotificationService {

    /** FCM multicast hard limit per request. */
    private static final int BATCH_SIZE = 500;

    private final FirebaseConfig firebaseConfig;
    private final DeviceTokenRepository deviceTokenRepository;

    /** Send to every enabled device of a single user. */
    @Async
    public void sendToUser(Long userId, String title, String body, Map<String, String> data, String imageUrl) {
        if (!ensureEnabled()) return;
        List<DeviceToken> tokens = deviceTokenRepository.findByUserIdAndEnabledTrue(userId);
        if (tokens.isEmpty()) {
            log.debug("No device tokens for user {}, skipping push.", userId);
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

    private void send(List<DeviceToken> tokens, String title, String body,
                      Map<String, String> data, String imageUrl) {
        List<DeviceToken> invalid = new ArrayList<>();

        for (int start = 0; start < tokens.size(); start += BATCH_SIZE) {
            List<DeviceToken> chunk = tokens.subList(start, Math.min(start + BATCH_SIZE, tokens.size()));
            List<String> tokenStrings = chunk.stream().map(DeviceToken::getToken).toList();

            MulticastMessage message = MulticastMessage.builder()
                    .addAllTokens(tokenStrings)
                    .setNotification(buildNotification(title, body, imageUrl))
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

    private Notification buildNotification(String title, String body, String imageUrl) {
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
