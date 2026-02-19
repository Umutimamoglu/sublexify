package com.sublex.service;

import com.sublex.model.WordDefinition;

public interface AIService {
    /**
     * Enriches a word with definition, difficulty, and examples using AI.
     * 
     * @param word The word to enrich
     * @return WordDefinition object or null if failed
     */
    WordDefinition enrichWord(String word, String difficulty);
}
