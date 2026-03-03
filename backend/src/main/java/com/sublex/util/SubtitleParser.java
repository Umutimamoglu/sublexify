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

    private static final Pattern URL_PATTERN = Pattern.compile("www\\.|http:|https:|\\.com|\\.net|\\.org",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]+>");
    private static final Pattern BRACKET_CONTENT_PATTERN = Pattern.compile("\\{[^}]*\\}");
    // GÜNCELLEME 1: Regex artık Unicode karakterleri (\p{L}), tire ve kesme
    // işaretlerini destekler.
    // Örn: "café", "long-term", "don't" tek token olarak yakalanır.
    // Max 2 hyphen/apostrophe segments: captures 'long-term', 'don't', 'well-to-do'
    // but NOT 'hotshot-chef-at-the-big-fancy' (which becomes individual tokens)
    private static final Pattern WORD_PATTERN = Pattern.compile("[\\p{L}]+(?:[''\\-][\\p{L}]+){0,2}");

    /**
     * Data holder for word analysis
     */
    public static class WordData {
        public int count;
        public String context;

        public WordData(int count, String context) {
            this.count = count;
            this.context = context;
        }
    }

    /**
     * Parse subtitle text and extract all words with their context
     * 
     * @param subtitleContent The raw .srt file content
     * @return Map of words to their data (count and first context)
     */
    public static Map<String, WordData> parseSubtitles(String subtitleContent) {
        Map<String, WordData> wordMap = new HashMap<>();

        if (subtitleContent == null || subtitleContent.isEmpty()) {
            return wordMap;
        }

        try (BufferedReader reader = new BufferedReader(new StringReader(subtitleContent))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();

                if (line.isEmpty() || line.matches("\\d+") || line.contains("-->"))
                    continue;

                // GÜNCELLEME 2: Reklam içeren satırları Regex ile kökten temizle (hiqve.com
                // vb.)
                if (URL_PATTERN.matcher(line).find() || line.contains("::::::"))
                    continue;

                // ASS/SSA metadata temizliği (Geliştirilmiş)
                if (line.startsWith("[") && line.endsWith("]"))
                    continue;
                if (line.startsWith(";"))
                    continue;

                // Daha kapsamlı teknik alan filtresi
                if (line.matches(
                        "(?i)^(Format|Style|ScriptType|PlayRes|Timer|Title|Original Script|Original Translation|Original Editing|Original Timing|Synch Point|Script Updated By|Update Details|Collisions|PlayDepth|Timer|ScaledBorderAndShadow):.*"))
                    continue;

                // ASS Dialogue satırları için (Text kısmını al)
                if (line.startsWith("Dialogue:")) {
                    String[] parts = line.split(",", 10);
                    if (parts.length >= 10) {
                        line = parts[9];
                    } else {
                        continue; // Hatalı dialogue satırı
                    }
                }

                extractWords(line, wordMap);
            }
        } catch (IOException e) {
            throw new RuntimeException("Error parsing subtitles", e);
        }

        return wordMap;
    }

    private static void extractWords(String line, Map<String, WordData> wordMap) {
        // 1. HTML taglerini temizle (<i>, <b> vs.)
        String cleanLine = HTML_TAG_PATTERN.matcher(line).replaceAll(" ");

        // 2. ASS süslü parantezlerini temizle ({\an8} gibi)
        cleanLine = BRACKET_CONTENT_PATTERN.matcher(cleanLine).replaceAll("");

        // GÜNCELLEME 4: ASS formatına özel \N (Yeni satır) ve ters slash temizliği
        cleanLine = cleanLine.replace("\\N", " ").replace("\\n", " ").replace("\\", " ");

        // Context cümlesi olarak temizlenmiş satırı sakla
        String contextSentence = cleanLine.trim();
        if (contextSentence.isEmpty())
            return;

        // Kelime ayıklama işlemi
        String processingLine = cleanLine;

        // GÜNCELLEME 3: Kesme işareti (') içeren kelimeleri köklerine ayır (Naive
        // Stemming) - KALDIRILDI: Artık regex ile butun olarak alıyoruz.
        if (processingLine.contains("'") || processingLine.contains("’")) {
            processingLine = processingLine.replace("’", "'");
        }

        // Locale.ENGLISH kullanımı Türkçe sunucularda "I" -> "i" dönüşümü için kritik.
        processingLine = processingLine.toLowerCase(Locale.ENGLISH);

        Matcher matcher = WORD_PATTERN.matcher(processingLine);
        while (matcher.find()) {
            String word = matcher.group();

            // GÜNCELLEME: Manuel split işlemi KALDIRILDI.
            // word = word.split("['’]")[0]; satırı silindi. "don't" artık "don't" olarak
            // kalır.

            if (word.isEmpty())
                continue;

            // Tek harfli kelime kontrolü: Sadece "a" ve "i" kabul edilir.
            if (word.length() == 1 && !word.equals("a") && !word.equals("i")) {
                continue;
            }

            // Maksimum kelime uzunluğu: 30 karakteri geçen tokenlar cümle parçasıdır.
            if (word.length() > 30) {
                continue;
            }

            // WordData güncelleme
            if (wordMap.containsKey(word)) {
                wordMap.get(word).count++;
                // Context zaten varsa ilkini koruyoruz, değiştirmiyoruz
            } else {
                wordMap.put(word, new WordData(1, contextSentence));
            }
        }
    }
}
