package com.sublex.dto;

/** Body for an admin push to a single user. {@code url} is an optional deep-link target. */
public record SendToUserRequest(Long userId, String title, String body, String imageUrl, String url) {
}
