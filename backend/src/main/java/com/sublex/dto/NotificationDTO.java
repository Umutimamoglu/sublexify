package com.sublex.dto;

import java.time.LocalDateTime;

public record NotificationDTO(
        Long id,
        String title,
        String body,
        String type,
        String url,
        String imageUrl,
        boolean read,
        LocalDateTime createdAt
) {}
