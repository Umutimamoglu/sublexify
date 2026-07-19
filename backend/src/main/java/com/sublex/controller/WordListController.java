package com.sublex.controller;

import com.sublex.dto.WordListDTO;
import com.sublex.dto.WordListWordsResponseDTO;
import com.sublex.service.WordListService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lists")
@RequiredArgsConstructor
 // Allow frontend access
public class WordListController {

    private final WordListService wordListService;

    @GetMapping
    public ResponseEntity<List<WordListDTO>> getUserLists(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        org.slf4j.LoggerFactory.getLogger(WordListController.class).info("Fetching lists for user: {}", userId);
        List<WordListDTO> userLists = wordListService.getUserLists(userId);
        org.slf4j.LoggerFactory.getLogger(WordListController.class).info("Found {} lists for user: {}",
                userLists.size(), userId);
        return ResponseEntity.ok(userLists);
    }

    @GetMapping("/media/imdb/{imdbId}")
    public ResponseEntity<List<WordListDTO>> getListsBySeries(@PathVariable String imdbId, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(wordListService.getListsBySeries(userId, imdbId));
    }

    @GetMapping("/standard")
    public ResponseEntity<List<WordListDTO>> getStandardLists(Authentication authentication) {
        Long userId = (authentication != null && authentication.getPrincipal() != null) 
                      ? (Long) authentication.getPrincipal() 
                      : null;
        return ResponseEntity.ok(wordListService.getStandardLists(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WordListDTO> getListById(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        java.util.Set<Long> knownWordIds = wordListService.getKnownWordIds(userId);
        return ResponseEntity.ok(wordListService.convertToDTO(wordListService.getListById(id), userId, knownWordIds));
    }

    @PostMapping
    public ResponseEntity<WordListDTO> createList(@RequestBody String name, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        String listName = name.replaceAll("^\"|\"$", "");
        java.util.Set<Long> knownWordIds = wordListService.getKnownWordIds(userId);
        return ResponseEntity.ok(
                wordListService.convertToDTO(wordListService.createList(userId, listName), userId, knownWordIds));
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

    @PatchMapping("/{id}")
    public ResponseEntity<WordListDTO> updateList(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> body,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        Long mediaId = null;
        if (body.containsKey("mediaId") && body.get("mediaId") != null) {
            mediaId = Long.parseLong(String.valueOf(body.get("mediaId")));
        }
        return ResponseEntity.ok(wordListService.updateList(id, body.get("name"), body.get("color"), mediaId, userId));
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
    public ResponseEntity<WordListDTO> generateUnknownWordsList(@RequestParam Long mediaId,
            Authentication authentication) {
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
