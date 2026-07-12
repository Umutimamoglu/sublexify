package com.sublex.controller;

import com.sublex.dto.AppInitDTO;
import com.sublex.service.MediaService;
import com.sublex.service.ProgressService;
import com.sublex.service.UserKnownWordService;
import com.sublex.service.UserMediaProgressService;
import com.sublex.service.WordListService;
import com.sublex.service.WordService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.function.Supplier;

@RestController
@RequestMapping("/api/app-init")
@RequiredArgsConstructor
@Slf4j
public class AppInitController {

    private static final int CONTINUE_LEARNING_LIMIT = 50;
    private static final int FREQUENT_WORDS_PAGE_SIZE = 50;

    private final MediaService mediaService;
    private final WordService wordService;
    private final WordListService wordListService;
    private final UserKnownWordService userKnownWordService;
    private final UserMediaProgressService userMediaProgressService;
    private final ProgressService progressService;

    /**
     * GET /api/app-init
     * Everything the mobile app needs on cold start in a single response.
     * Anonymous callers (onboarding) get the public catalog only; a failing
     * section is returned as null instead of failing the whole request.
     */
    @GetMapping
    public ResponseEntity<AppInitDTO> getAppInit(Authentication authentication) {
        Long userId = (authentication != null && authentication.getPrincipal() instanceof Long principal)
                ? principal
                : null;

        AppInitDTO.AppInitDTOBuilder payload = AppInitDTO.builder()
                .media(safe("media", () -> mediaService.getAllMedia(userId)))
                .frequentWords(safe("frequentWords", () ->
                        wordService.getFrequentWords("en", null, 0, FREQUENT_WORDS_PAGE_SIZE, userId, false)));

        if (userId != null) {
            payload
                .continueLearning(safe("continueLearning", () ->
                        mediaService.getRecentMediaForUser(userId, CONTINUE_LEARNING_LIMIT)))
                .lists(safe("lists", () -> wordListService.getUserLists(userId)))
                .userStatistics(safe("userStatistics", () -> userKnownWordService.getUserStatistics(userId)))
                .knownWords(safe("knownWords", () -> userKnownWordService.getUserKnownWords(userId)))
                .watchedMediaIds(safe("watchedMediaIds", () -> userMediaProgressService.getWatchedMediaIds(userId)))
                .progressStats(safe("progressStats", () -> progressService.getStats(userId)));
        }

        return ResponseEntity.ok(payload.build());
    }

    private <T> T safe(String section, Supplier<T> supplier) {
        try {
            return supplier.get();
        } catch (Exception e) {
            log.warn("app-init section '{}' failed: {}", section, e.getMessage());
            return null;
        }
    }
}
