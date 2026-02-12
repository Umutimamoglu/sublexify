package com.sublex.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class OpenSubtitlesScraperServiceTest {

    @Test
    public void testScrapeMrRobot() {
        OpenSubtitlesScraperService scraper = new OpenSubtitlesScraperService();
        // Mr. Robot S01E01 - Episode IMDB ID: tt4158110
        String episodeImdbId = "tt4158110";

        try {
            String srtContent = scraper.scrape(episodeImdbId);
            assertNotNull(srtContent);
            assertTrue(srtContent.length() > 0);
            System.out.println("Scraping successful! Content length: " + srtContent.length());
            // Print first few lines to verify it's subtitle content
            System.out.println("First 200 chars:\n" + srtContent.substring(0, Math.min(srtContent.length(), 200)));
        } catch (Exception e) {
            fail("Scraping failed: " + e.getMessage());
        }
    }
}
