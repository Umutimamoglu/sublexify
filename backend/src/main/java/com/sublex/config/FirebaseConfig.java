package com.sublex.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * Initializes the Firebase Admin SDK for sending FCM push notifications.
 *
 * Credentials are resolved in this order:
 *  1. FIREBASE_SERVICE_ACCOUNT_JSON  — the full service-account JSON as a string (preferred on Railway)
 *  2. FIREBASE_SERVICE_ACCOUNT_PATH  — path to a service-account JSON file (local dev)
 *
 * If neither is provided the app still boots; {@link #isInitialized()} stays false and
 * {@link com.sublex.service.PushNotificationService} becomes a no-op (logs a warning).
 */
@Slf4j
@Component
public class FirebaseConfig {

    @Value("${FIREBASE_SERVICE_ACCOUNT_JSON:}")
    private String serviceAccountJson;

    @Value("${FIREBASE_SERVICE_ACCOUNT_PATH:}")
    private String serviceAccountPath;

    private boolean initialized = false;

    @PostConstruct
    public void init() {
        if (!FirebaseApp.getApps().isEmpty()) {
            initialized = true;
            return;
        }
        try {
            InputStream credentialsStream = resolveCredentialsStream();
            if (credentialsStream == null) {
                log.warn("Firebase credentials not configured (set FIREBASE_SERVICE_ACCOUNT_JSON or "
                        + "FIREBASE_SERVICE_ACCOUNT_PATH). Push notifications are DISABLED.");
                return;
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                    .build();
            FirebaseApp.initializeApp(options);
            initialized = true;
            log.info("Firebase Admin SDK initialized — push notifications enabled.");
        } catch (Exception e) {
            log.error("Failed to initialize Firebase Admin SDK. Push notifications are DISABLED. Cause: {}",
                    e.getMessage());
        }
    }

    private InputStream resolveCredentialsStream() throws Exception {
        if (serviceAccountJson != null && !serviceAccountJson.isBlank()) {
            return new ByteArrayInputStream(serviceAccountJson.getBytes(StandardCharsets.UTF_8));
        }
        if (serviceAccountPath != null && !serviceAccountPath.isBlank()) {
            return new FileInputStream(serviceAccountPath);
        }
        return null;
    }

    public boolean isInitialized() {
        return initialized;
    }
}
