package com.sublex.dto;

/** Body for registering a device's FCM token. */
public record DeviceTokenRequest(String token, String platform) {
}
