package com.sublex.service;

import com.sublex.dto.FeedbackDTO;
import com.sublex.dto.MediaRequestDTO;
import com.sublex.model.Feedback;
import com.sublex.model.MediaRequest;
import com.sublex.model.User;
import com.sublex.event.MediaRequestApprovedEvent;
import com.sublex.repository.FeedbackRepository;
import com.sublex.repository.MediaRequestRepository;
import com.sublex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final MediaRequestRepository mediaRequestRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void submitMediaRequests(Long userId, List<MediaRequestDTO> requests) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<MediaRequest> entities = requests.stream().map(dto -> {
            MediaRequest request = new MediaRequest();
            request.setUser(user);
            request.setTmdbId(dto.getTmdbId());
            request.setImdbId(dto.getImdbId());
            request.setTitle(dto.getTitle());
            request.setPosterPath(dto.getPosterPath());
            request.setMediaType(dto.getMediaType());
            return request;
        }).collect(Collectors.toList());

        mediaRequestRepository.saveAll(entities);
    }

    @Transactional
    public void submitFeedback(Long userId, String message, String category) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Feedback feedback = new Feedback();
        feedback.setUser(user);
        feedback.setMessage(message);
        feedback.setCategory(category);
        feedbackRepository.save(feedback);
    }

    public List<MediaRequestDTO> getAllMediaRequests() {
        return mediaRequestRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToMediaRequestDTO)
                .collect(Collectors.toList());
    }

    public List<FeedbackDTO> getAllFeedbacks() {
        return feedbackRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToFeedbackDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateRequestStatus(Long requestId, String status) {
        MediaRequest request = mediaRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));
        boolean wasApproved = "APPROVED".equalsIgnoreCase(request.getStatus());
        request.setStatus(status);
        mediaRequestRepository.save(request);

        // Notify the requesting user the first time their request flips to APPROVED.
        if (!wasApproved && "APPROVED".equalsIgnoreCase(status)) {
            eventPublisher.publishEvent(
                    new MediaRequestApprovedEvent(this, request.getUser().getId(), request.getTitle()));
        }
    }

    private MediaRequestDTO mapToMediaRequestDTO(MediaRequest request) {
        MediaRequestDTO dto = new MediaRequestDTO();
        dto.setId(request.getId());
        dto.setUserId(request.getUser().getId());
        dto.setUserName(request.getUser().getName());
        dto.setUserEmail(request.getUser().getEmail());
        dto.setTmdbId(request.getTmdbId());
        dto.setImdbId(request.getImdbId());
        dto.setTitle(request.getTitle());
        dto.setPosterPath(request.getPosterPath());
        dto.setMediaType(request.getMediaType());
        dto.setStatus(request.getStatus());
        dto.setCreatedAt(request.getCreatedAt());
        return dto;
    }

    private FeedbackDTO mapToFeedbackDTO(Feedback feedback) {
        FeedbackDTO dto = new FeedbackDTO();
        dto.setId(feedback.getId());
        dto.setUserId(feedback.getUser().getId());
        dto.setUserName(feedback.getUser().getName());
        dto.setUserEmail(feedback.getUser().getEmail());
        dto.setMessage(feedback.getMessage());
        dto.setCategory(feedback.getCategory());
        dto.setCreatedAt(feedback.getCreatedAt());
        return dto;
    }
}
