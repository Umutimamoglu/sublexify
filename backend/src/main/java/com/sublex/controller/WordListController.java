package com.sublex.controller;

import com.sublex.model.WordList;
import com.sublex.service.WordListService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lists")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // Allow frontend access
public class WordListController {

    private final WordListService wordListService;

    // Hardcoded user ID since auth is disabled
    private final Long CURRENT_USER_ID = 1L;

    @GetMapping
    public ResponseEntity<List<WordList>> getUserLists() {
        return ResponseEntity.ok(wordListService.getUserLists(CURRENT_USER_ID));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WordList> getListById(@PathVariable Long id) {
        return ResponseEntity.ok(wordListService.getListById(id));
    }

    @PostMapping
    public ResponseEntity<WordList> createList(@RequestBody String name) {
        // Simple string body for name, might want a DTO later but this works for simple
        // string
        // Removing quotes if sent as JSON string
        String listName = name.replaceAll("^\"|\"$", "");
        return ResponseEntity.ok(wordListService.createList(CURRENT_USER_ID, listName));
    }

    @PostMapping("/{id}/words/{wordId}")
    public ResponseEntity<Void> addWordToList(@PathVariable Long id, @PathVariable Long wordId) {
        wordListService.addWordToList(id, wordId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/words/{wordId}")
    public ResponseEntity<Void> removeWordFromList(@PathVariable Long id, @PathVariable Long wordId) {
        wordListService.removeWordFromList(id, wordId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/generate/unknown")
    public ResponseEntity<WordList> generateUnknownWordsList(@RequestParam Long mediaId) {
        return ResponseEntity.ok(wordListService.createUnknownWordsList(CURRENT_USER_ID, mediaId));
    }
}
