package com.sublex.controller;

import com.sublex.service.UserListPreferenceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/preferences/lists")
@RequiredArgsConstructor
public class UserPreferenceController {

    private final UserListPreferenceService preferenceService;

    @GetMapping("/hidden")
    public ResponseEntity<List<Long>> getHiddenLists(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(preferenceService.getHiddenListIds(userId));
    }

    @PostMapping("/hidden")
    public ResponseEntity<Void> syncHiddenLists(@RequestBody List<Long> hiddenListIds, Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(401).build();
        }
        Long userId = (Long) authentication.getPrincipal();
        preferenceService.syncHiddenLists(userId, hiddenListIds);
        return ResponseEntity.ok().build();
    }
}
