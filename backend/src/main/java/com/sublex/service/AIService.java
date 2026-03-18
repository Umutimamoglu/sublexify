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
     * Audits a list of words using the STEP 3 Quality Gate rules.
     * 
     * @param words List of Word objects with their current definitions
     * @return Map of word strings to their audit results (problem_found, step3_error)
     */
    Map<String, Map<String, Object>> auditWordsBatch(List<Word> words);

    /**
     * Enriches a batch of words using AI.
     * 
     * @param words List of Word objects to enrich
     * @return Map of word strings to their definitions
     */
    Map<String, WordDefinition> enrichWordsBatch(List<Word> words);
}
