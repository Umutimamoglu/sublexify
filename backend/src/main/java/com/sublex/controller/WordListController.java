package com.sublex.controller;

import com.sublex.dto.WordListDTO;
import com.sublex.dto.WordListWordsResponseDTO;
import com.sublex.model.WordList;
import com.sublex.service.WordListService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/lists")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // Allow frontend access
public class WordListController {

    private final WordListService wordListService;

    @GetMapping
    public ResponseEntity<List<WordListDTO>> getUserLists(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        List<WordListDTO> userLists = wordListService.getUserLists(userId);
        return ResponseEntity.ok(userLists);
    }

    @GetMapping("/standard")
    public ResponseEntity<List<WordListDTO>> getStandardLists() {
        return ResponseEntity.ok(wordListService.getStandardLists());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WordListDTO> getListById(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(wordListService.convertToDTO(wordListService.getListById(id), userId));
    }

    @PostMapping
    public ResponseEntity<WordListDTO> createList(@RequestBody String name, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        // Simple string body for name, might want a DTO later but this works for simple
        // string
        // Removing quotes if sent as JSON string
        String listName = name.replaceAll("^\"|\"$", "");
        return ResponseEntity.ok(
                wordListService.convertToDTO(wordListService.createList(userId, listName), userId));
    }

    @PostMapping("/{id}/words/{wordId}")
    public ResponseEntity<Void> addWordToList(@PathVariable Long id, @PathVariable Long wordId) {
        wordListService.addWordToList(id, wordId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/containing-word/{wordId}")
    public ResponseEntity<List<Long>> getListsContainingWord(@PathVariable Long wordId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(wordListService.getListsContainingWord(userId, wordId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteList(@PathVariable Long id) {
        wordListService.deleteList(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}/words/{wordId}")
    public ResponseEntity<Void> removeWordFromList(@PathVariable Long id, @PathVariable Long wordId) {
        wordListService.removeWordFromList(id, wordId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/generate/unknown")
    public ResponseEntity<WordListDTO> generateUnknownWordsList(@RequestParam Long mediaId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(wordListService.createUnknownWordsList(userId, mediaId));
    }

    @GetMapping("/{id}/words")
    public ResponseEntity<WordListWordsResponseDTO> getListWords(
            @PathVariable Long id,
            @RequestParam(required = false) Boolean onlyUnknown,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(wordListService.getListWords(id, userId, onlyUnknown != null && onlyUnknown));
    }

    @PostMapping("/{id}/generate/unknown")
    public ResponseEntity<WordListDTO> createSubListFromUnknown(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(wordListService.createSubListFromUnknown(userId, id));
    }
}
