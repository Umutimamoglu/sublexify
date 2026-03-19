package com.sublex.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FeedbackDTO {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private String message;
    private String category;
    private LocalDateTime createdAt;
}
