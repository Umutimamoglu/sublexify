package com.sublex.controller;

import com.sublex.dto.WordListDTO;
import com.sublex.dto.WordListWordsResponseDTO;
import com.sublex.model.WordList;
import com.sublex.service.WordListService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
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
    public ResponseEntity<List<WordListDTO>> getUserLists() {
        List<WordListDTO> userLists = wordListService.getUserLists(CURRENT_USER_ID);
        // Note: Known words list is currently handled specially or returned as a
        // WordListDTO
        // In the interest of unification, we could add it to the userLists or return it
        // separately

        return ResponseEntity.ok(userLists);
    }

    @GetMapping("/standard")
    public ResponseEntity<List<WordListDTO>> getStandardLists() {
        return ResponseEntity.ok(wordListService.getStandardLists());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WordListDTO> getListById(@PathVariable Long id) {
        return ResponseEntity.ok(wordListService.convertToDTO(wordListService.getListById(id), CURRENT_USER_ID));
    }

    @PostMapping
    public ResponseEntity<WordListDTO> createList(@RequestBody String name) {
        // Simple string body for name, might want a DTO later but this works for simple
        // string
        // Removing quotes if sent as JSON string
        String listName = name.replaceAll("^\"|\"$", "");
        return ResponseEntity.ok(
                wordListService.convertToDTO(wordListService.createList(CURRENT_USER_ID, listName), CURRENT_USER_ID));
    }

    @PostMapping("/{id}/words/{wordId}")
    public ResponseEntity<Void> addWordToList(@PathVariable Long id, @PathVariable Long wordId) {
        wordListService.addWordToList(id, wordId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/containing-word/{wordId}")
    public ResponseEntity<List<Long>> getListsContainingWord(@PathVariable Long wordId) {
        return ResponseEntity.ok(wordListService.getListsContainingWord(CURRENT_USER_ID, wordId));
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
    public ResponseEntity<WordListDTO> generateUnknownWordsList(@RequestParam Long mediaId) {
        return ResponseEntity.ok(wordListService.createUnknownWordsList(CURRENT_USER_ID, mediaId));
    }

    @GetMapping("/{id}/words")
    public ResponseEntity<WordListWordsResponseDTO> getListWords(
            @PathVariable Long id,
            @RequestParam(required = false) Boolean onlyUnknown) {
        return ResponseEntity.ok(wordListService.getListWords(id, CURRENT_USER_ID, onlyUnknown != null && onlyUnknown));
    }

    @PostMapping("/{id}/generate/unknown")
    public ResponseEntity<WordListDTO> createSubListFromUnknown(@PathVariable Long id) {
        return ResponseEntity.ok(wordListService.createSubListFromUnknown(CURRENT_USER_ID, id));
    }
}
