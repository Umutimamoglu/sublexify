package com.sublex.service;

import com.sublex.model.Word;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.BiConsumer;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditorService {

    private final WordRepository wordRepository;
    private final AIService aiService;

    @Transactional
    public void auditRecentWords(int limit, BiConsumer<Integer, Integer> progressCallback) {
        log.info("Starting Step 3 Audit for {} words", limit);
        
        List<Word> words = wordRepository.findWordsForAuditing(PageRequest.of(0, limit));
        int total = words.size();
        if (total == 0) {
            log.info("No words found for auditing.");
            return;
        }

        int batchSize = 25; // Audit 25 words per GPT-5 call for efficiency
        AtomicInteger processed = new AtomicInteger(0);

        for (int i = 0; i < words.size(); i += batchSize) {
            int end = Math.min(i + batchSize, words.size());
            List<Word> batch = words.subList(i, end);
            
            log.info("Auditing batch of {} words...", batch.size());
            Map<String, Map<String, Object>> results = aiService.auditWordsBatch(batch);
            
            for (Word word : batch) {
                Map<String, Object> result = results.get(word.getWord());
                if (result != null) {
                    Boolean problemFound = (Boolean) result.get("problem_found");
                    String error = (String) result.get("step3_error");
                    
                    boolean isProblem = problemFound != null && problemFound;
                    word.setProblemFound(isProblem);
                    
                    if (isProblem) {
                        word.setStep3Error(error);
                        log.warn("AUDIT FAIL: '{}' - {}", word.getWord(), error);
                    } else {
                        word.setStep3Error("Clean");
                    }
                }
                processed.incrementAndGet();
            }
            wordRepository.saveAll(batch);
            if (progressCallback != null) {
                progressCallback.accept(processed.get(), total);
            }
        }
        
        log.info("Step 3 Audit complete. Found {} problems out of {} words.", 
            words.stream().filter(w -> Boolean.TRUE.equals(w.getProblemFound())).count(), total);
    }
}
