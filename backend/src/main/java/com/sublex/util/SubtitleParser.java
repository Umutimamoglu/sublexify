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

    // GÜNCELLEME 1: Regex artık Akıllı Tırnak (\u2019 -> ’) işaretini de
    // destekliyor.
    // ['’\-] -> Düz tırnak, Kıvrık tırnak veya Tire
    private static final Pattern WORD_PATTERN = Pattern.compile("[\\p{L}]+(?:['’\\-][\\p{L}]+)*");

    private static final Pattern HTML_TAG_PATTERN = Pattern.compile("<[^>]+>");
    private static final Pattern BRACKET_CONTENT_PATTERN = Pattern.compile("\\{[^}]+\\}");

    // GÜNCELLEME 2: Daha agresif bir URL/Reklam filtresi
    private static final Pattern URL_PATTERN = Pattern
            .compile("(?i).*(www\\.|http|\\.com|\\.net|\\.org|\\.co\\b|\\.uk\\b).*");

    /**
     * Parse subtitle text and extract all words
     * 
     * @param subtitleContent The raw .srt file content
     * @return Map of words to their occurrence count
     */
    public static Map<String, Integer> parseSubtitles(String subtitleContent) {
        Map<String, Integer> wordCount = new HashMap<>();

        if (subtitleContent == null || subtitleContent.isEmpty()) {
            return wordCount;
        }

        try (BufferedReader reader = new BufferedReader(new StringReader(subtitleContent))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();

                if (line.isEmpty())
                    continue;

                // Sayısal indexleri atla (sadece rakamdan oluşan satırlar)
                if (line.matches("\\d+"))
                    continue;

                // Zaman damgalarını atla
                if (line.contains("-->"))
                    continue;

                // GÜNCELLEME 2: Reklam içeren satırları Regex ile kökten temizle (hiqve.com
                // vb.)
                if (URL_PATTERN.matcher(line).find())
                    continue;
                if (line.contains("::::::"))
                    continue; // Özel reklam ayraçları

                // ASS/SSA metadata temizliği
                if (line.startsWith("[") || line.startsWith(";"))
                    continue;
                if (line.matches("(?i)^(Format|Style|ScriptType|PlayRes|Timer|Title|Original Script):.*"))
                    continue;

                // ASS Dialogue satırları için (Text kısmını al)
                if (line.startsWith("Dialogue:")) {
                    String[] parts = line.split(",", 10);
                    if (parts.length >= 10) {
                        line = parts[9];
                    }
                }

                extractWords(line, wordCount);
            }
        } catch (IOException e) {
            throw new RuntimeException("Error parsing subtitles", e);
        }

        return wordCount;
    }

    private static void extractWords(String line, Map<String, Integer> wordCount) {
        // 1. HTML taglerini temizle (<i>, <b> vs.)
        line = HTML_TAG_PATTERN.matcher(line).replaceAll(" ");

        // 2. ASS süslü parantezlerini temizle ({\an8} gibi)
        line = BRACKET_CONTENT_PATTERN.matcher(line).replaceAll("");

        // GÜNCELLEME 4: ASS formatına özel \N (Yeni satır) ve ters slash temizliği
        // Bu karakterler temizlenmezse "nWord" şeklinde hatalı kelimeler oluşur.
        line = line.replace("\\N", " ").replace("\\n", " ").replace("\\", " ");

        // GÜNCELLEME 3: Akıllı tırnakları düz tırnağa çeviriyoruz (Standardizasyon)
        // Veritabanında hem "don't" hem "don’t" olmasın, hepsi "don't" olsun.
        line = line.replace('’', '\'');

        // Locale.ENGLISH kullanımı Türkçe sunucularda "I" -> "i" dönüşümü için kritik.
        line = line.toLowerCase(Locale.ENGLISH);

        Matcher matcher = WORD_PATTERN.matcher(line);
        while (matcher.find()) {
            String word = matcher.group();

            // Tek başına kalan tire veya kesme işaretlerini filtrele (Nadir hatalar için)
            if (word.length() <= 1 && !Character.isLetter(word.charAt(0))) {
                continue;
            }

            wordCount.put(word, wordCount.getOrDefault(word, 0) + 1);
        }
    }
}
