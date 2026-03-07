package com.sublex.controller;

import com.sublex.dto.ProgressStatsDTO;
import com.sublex.service.ProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/progress")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @GetMapping("/stats")
    public ResponseEntity<ProgressStatsDTO> getStats(@RequestParam Long userId) {
        return ResponseEntity.ok(progressService.getStats(userId));
    }
}
