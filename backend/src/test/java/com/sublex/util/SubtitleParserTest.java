package com.sublex.util;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class SubtitleParserTest {

    @Test
    void testParseSimpleSubtitle() {
        String srtContent = """
                1
                00:00:01,000 --> 00:00:03,000
                Hello world! This is a test.

                2
                00:00:04,000 --> 00:00:06,000
                Hello again. Testing the parser.

                3
                00:00:07,000 --> 00:00:09,000
                World of testing continues.
                """;

        Map<String, Integer> wordCount = SubtitleParser.parseSubtitles(srtContent);

        // Verify word counts
        assertEquals(2, wordCount.get("hello"), "hello should appear 2 times");
        assertEquals(2, wordCount.get("world"), "world should appear 2 times");
        assertEquals(2, wordCount.get("testing"), "testing should appear 2 times");
        assertEquals(1, wordCount.get("test"), "test should appear 1 time");
        assertEquals(1, wordCount.get("is"), "is should appear 1 time");
        assertEquals(1, wordCount.get("a"), "a should appear 1 time");
    }

    @Test
    void testParseSubtitleWithHtmlTags() {
        String srtContent = """
                1
                00:00:01,000 --> 00:00:03,000
                <i>Hello</i> <b>world</b>!

                2
                00:00:04,000 --> 00:00:06,000
                <font color="red">Testing</font> HTML tags.
                """;

        Map<String, Integer> wordCount = SubtitleParser.parseSubtitles(srtContent);

        // Verify HTML tags are removed
        assertEquals(1, wordCount.get("hello"));
        assertEquals(1, wordCount.get("world"));
        assertEquals(1, wordCount.get("testing"));
        assertEquals(1, wordCount.get("html"));
        assertEquals(1, wordCount.get("tags"));
        assertNull(wordCount.get("i"), "HTML tag 'i' should not be counted as word");
        assertNull(wordCount.get("b"), "HTML tag 'b' should not be counted as word");
    }

    @Test
    void testEmptySubtitle() {
        String srtContent = "";

        Map<String, Integer> wordCount = SubtitleParser.parseSubtitles(srtContent);

        assertTrue(wordCount.isEmpty(), "Empty subtitle should result in empty word map");
    }

    @Test
    void testSubtitleWithOnlyTimestamps() {
        String srtContent = """
                1
                00:00:01,000 --> 00:00:03,000

                2
                00:00:04,000 --> 00:00:06,000
                """;

        Map<String, Integer> wordCount = SubtitleParser.parseSubtitles(srtContent);

        assertTrue(wordCount.isEmpty(), "Subtitle with only timestamps should result in empty word map");
    }
}
