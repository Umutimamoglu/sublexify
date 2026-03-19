package com.sublex.controller;

import com.sublex.dto.FeedbackDTO;
import com.sublex.dto.MediaRequestDTO;
import com.sublex.security.UserPrincipal;
import com.sublex.service.FeedbackService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    @PostMapping("/media-request")
    public ResponseEntity<Void> submitMediaRequests(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody List<MediaRequestDTO> requests) {
        feedbackService.submitMediaRequests(userPrincipal.getId(), requests);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/submit")
    public ResponseEntity<Void> submitFeedback(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestBody Map<String, String> body) {
        String message = body.get("message");
        String category = body.get("category");
        feedbackService.submitFeedback(userPrincipal.getId(), message, category);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/media-requests")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MediaRequestDTO>> getAllMediaRequests() {
        return ResponseEntity.ok(feedbackService.getAllMediaRequests());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<FeedbackDTO>> getAllFeedbacks() {
        return ResponseEntity.ok(feedbackService.getAllFeedbacks());
    }

    @PutMapping("/media-requests/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> updateRequestStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String status = body.get("status");
        feedbackService.updateRequestStatus(id, status);
        return ResponseEntity.ok().build();
    }
}
