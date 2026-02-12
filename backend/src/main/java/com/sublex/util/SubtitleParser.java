package com.sublex.util;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.StringReader;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility class for parsing .srt subtitle files and extracting words
 */
public class SubtitleParser {

    private static final Pattern WORD_PATTERN = Pattern.compile("\\b[a-zA-Z]+\\b");

    /**
     * Parse subtitle text and extract all words
     * 
     * @param subtitleContent The raw .srt file content
     * @return Map of words to their occurrence count
     */
    public static Map<String, Integer> parseSubtitles(String subtitleContent) {
        Map<String, Integer> wordCount = new HashMap<>();

        try (BufferedReader reader = new BufferedReader(new StringReader(subtitleContent))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();

                if (line.isEmpty())
                    continue;

                // Skip SRT sequence numbers and timestamps
                if (line.matches("\\d+"))
                    continue;
                if (line.matches(".*-->.*"))
                    continue;

                // Skip ASS/SSA metadata lines
                if (line.startsWith("[") || line.startsWith(";"))
                    continue;
                if (line.matches("(?i)^(Format|Style|ScriptType|PlayRes|Timer):.*"))
                    continue;

                // For ASS Dialogue lines, only take the text after the 9th comma
                if (line.startsWith("Dialogue:")) {
                    String[] parts = line.split(",", 10);
                    if (parts.length >= 10) {
                        line = parts[9];
                    }
                }

                // This is likely subtitle text
                extractWords(line, wordCount);
            }
        } catch (IOException e) {
            throw new RuntimeException("Error parsing subtitles", e);
        }

        return wordCount;
    }

    /**
     * Extract words from a line and update word count
     */
    private static void extractWords(String line, Map<String, Integer> wordCount) {
        // Remove HTML tags if present
        line = line.replaceAll("<[^>]+>", "");

        // Convert to lowercase for consistency
        line = line.toLowerCase();

        Matcher matcher = WORD_PATTERN.matcher(line);
        while (matcher.find()) {
            String word = matcher.group();
            wordCount.put(word, wordCount.getOrDefault(word, 0) + 1);
        }
    }
}
