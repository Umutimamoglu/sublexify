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
    WordDefinition enrichWord(String word, String difficulty, String contextSentence);

    /**
     * Enriches a word while strictly respecting the provided difficulty level.
     * Useful for trusted lists like Oxford.
     * 
     * @param word            The word to enrich
     * @param difficulty      The trusted difficulty level
     * @param contextSentence The context in which the word is used
     * @return WordDefinition object or null if failed
     */
    WordDefinition enrichTrustedWord(String word, String difficulty, String contextSentence);

    /**
     * Enriches a list of words in a single batch.
     * 
     * @param words List of Word objects to enrich
     * @return Map of word strings to their enriched definitions
     */
    Map<String, WordDefinition> enrichWordsBatch(List<Word> words);
}
