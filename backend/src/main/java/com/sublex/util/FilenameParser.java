package com.sublex.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class FilenameParser {

    private static final Pattern SEASON_EPISODE_PATTERN = Pattern.compile("(?i)(.+)?[ .]S(\\d{1,2})E(\\d{1,2})");
    private static final Pattern YEAR_PATTERN = Pattern.compile("(?i)(.+)[ .](\\d{4})");

    public record MediaInfo(String title, Integer year, Integer season, Integer episode, boolean isSeries) {
    }

    public static MediaInfo parse(String filename) {
        // Remove extension
        String name = filename;
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex > 0) {
            name = filename.substring(0, lastDotIndex);
        }

        // Check for SxxExx pattern (Series)
        Matcher seMatcher = SEASON_EPISODE_PATTERN.matcher(name);
        if (seMatcher.find()) {
            String rawTitle = seMatcher.group(1).replace('.', ' ').trim();
            int season = Integer.parseInt(seMatcher.group(2));
            int episode = Integer.parseInt(seMatcher.group(3));
            return new MediaInfo(rawTitle, null, season, episode, true);
        }

        // Check for Year pattern (Movie)
        Matcher yearMatcher = YEAR_PATTERN.matcher(name);
        if (yearMatcher.find()) {
            String rawTitle = yearMatcher.group(1).replace('.', ' ').trim();
            int year = Integer.parseInt(yearMatcher.group(2));
            return new MediaInfo(rawTitle, year, null, null, false);
        }

        // Fallback: treat whole name as title
        return new MediaInfo(name.replace('.', ' ').trim(), null, null, null, false);
    }
}
