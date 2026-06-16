package com.sublex.dto;

/** Body for an admin broadcast push. {@code url} is an optional in-app deep-link target. */
public record BroadcastRequest(String title, String body, String imageUrl, String url) {
}
