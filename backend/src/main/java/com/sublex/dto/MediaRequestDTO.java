package com.sublex.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MediaRequestDTO {
    private Long id;
    private Long userId;
    private String userName;
    private String userEmail;
    private Long tmdbId;
    private String imdbId;
    private String title;
    private String posterPath;
    private String mediaType;
    private String status;
    private LocalDateTime createdAt;
}
