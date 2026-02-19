package com.sublex.service;

import com.sublex.model.Word;
import com.sublex.model.WordDefinition;
import java.util.List;
import java.util.Map;

public interface AIService {
    /**
     * Enriches a word with definition, difficulty, and examples using AI.
     * 
     * @param word The word to enrich
     * @return WordDefinition object or null if failed
     */
    WordDefinition enrichWord(String word, String difficulty);

    /**
     * Enriches a list of words in a single batch.
     * 
     * @param words List of Word objects to enrich
     * @return Map of word strings to their enriched definitions
     */
    Map<String, WordDefinition> enrichWordsBatch(List<Word> words);
}
