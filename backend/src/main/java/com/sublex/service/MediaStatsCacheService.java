package com.sublex.service;

import com.sublex.repository.MediaWordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaStatsCacheService {

    private final MediaWordRepository mediaWordRepository;

    @Cacheable("globalWordCounts")
    public Map<Long, Integer> getGlobalWordCounts() {
        log.info("Fetching global word counts from database (Cache Miss)");
        return mediaWordRepository.countAllByMediaId()
                .stream()
                .collect(Collectors.toMap(
                        obj -> (Long) obj[0],
                        obj -> ((Long) obj[1]).intValue()
                ));
    }

    @Cacheable("globalLevelCounts")
    public Map<Long, Map<String, Long>> getGlobalLevelCounts() {
        log.info("Fetching global level counts from database (Cache Miss)");
        Map<Long, Map<String, Long>> levelCountsByMedia = new java.util.HashMap<>();
        List<Object[]> rows = mediaWordRepository.findLevelCountsAllMedia();
        for (Object[] row : rows) {
            Long mediaId = (Long) row[0];
            String diff = (String) row[1];
            Long count = (Long) row[2];
            levelCountsByMedia.computeIfAbsent(mediaId, k -> new LinkedHashMap<>()).put(diff, count);
        }
        return levelCountsByMedia;
    }

    @CacheEvict(value = {"globalWordCounts", "globalLevelCounts"}, allEntries = true)
    public void evictMediaStatsCache() {
        log.info("Evicting global media stats cache");
    }
}
