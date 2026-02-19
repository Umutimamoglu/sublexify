package com.sublex.service;

import com.sublex.dto.PipelineStatus;
import com.sublex.model.Word;
import com.sublex.model.WordDefinition;
import com.sublex.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
@Slf4j
public class PipelineService {

    private final WordRepository wordRepository;
    private final AIService aiService;
    private final AuditService auditService;
    private final SpecialistService specialistService;
    private final JudgeService judgeService;

    private final AtomicReference<PipelineStatus> currentStatus = new AtomicReference<>(
            PipelineStatus.builder().currentStep(PipelineStatus.Step.IDLE).build());

    private final Semaphore workerSemaphore = new Semaphore(10);
    private final Semaphore specialistSemaphore = new Semaphore(5);
    private final Semaphore judgeSemaphore = new Semaphore(5);

    /**
     * Returns the current pipeline status for polling.
     */
    public PipelineStatus getStatus() {
        return currentStatus.get();
    }

    public void startPipeline(int batchSize) {
        startPipeline(batchSize, null);
    }

    public void startPipeline(int batchSize, Long mediaId) {
        PipelineStatus status = currentStatus.get();
        if (status.isRunning()) {
            log.warn("Pipeline already running. Ignoring start request.");
            return;
        }

        // Initialize status
        PipelineStatus initial = PipelineStatus.builder()
                .currentStep(PipelineStatus.Step.WORKER)
                .totalWords(batchSize)
                .processedWords(0)
                .progressPercent(0)
                .running(true)
                .startedAt(LocalDateTime.now())
                .build();
        currentStatus.set(initial);

        // Run the pipeline in a separate thread
        Thread.startVirtualThread(() -> {
            try {
                runPipeline(batchSize, mediaId);
            } catch (Exception e) {
                log.error("Pipeline failed with error: {}", e.getMessage(), e);
                PipelineStatus failed = currentStatus.get();
                failed.setCurrentStep(PipelineStatus.Step.FAILED);
                failed.setRunning(false);
                failed.setCompletedAt(LocalDateTime.now());
                currentStatus.set(failed);
            }
        });
    }

    private void runPipeline(int batchSize, Long mediaId) {
        long pipelineStart = System.currentTimeMillis();

        // ======= STEP 1: WORKER (GPT-4.1-mini) =======
        log.info("=== PIPELINE STEP 1: WORKER (GPT-4.1-mini) ===");
        long stepStart = System.currentTimeMillis();

        List<Word> words = (mediaId == null)
                ? wordRepository.findPendingEnrichmentWithLimit(batchSize)
                : wordRepository.findPendingEnrichmentByMediaId(mediaId);
        int actualSize = words.size();

        PipelineStatus status = currentStatus.get();
        status.setTotalWords(actualSize);
        currentStatus.set(status);

        if (words.isEmpty()) {
            log.info("No pending words to enrich. Pipeline complete.");
            status.setCurrentStep(PipelineStatus.Step.COMPLETE);
            status.setRunning(false);
            status.setCompletedAt(LocalDateTime.now());
            currentStatus.set(status);
            return;
        }

        LocalDateTime batchTime = LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        AtomicInteger workerDone = new AtomicInteger(0);

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (Word word : words) {
                executor.submit(() -> {
                    try {
                        workerSemaphore.acquire();
                        try {
                            WordDefinition def = aiService.enrichWord(word.getWord(), word.getDifficulty());
                            if (def != null) {
                                word.setDefinition(def);
                                word.setDifficulty(def.getDifficulty());
                                word.setIsEnriched(true);
                                word.setNeedsReEnrichment(false);
                                word.setEnrichedAt(batchTime);
                                log.debug("Worker enriched '{}' ({})", word.getWord(), word.getDifficulty());
                            } else {
                                log.error("Worker returned null for '{}'", word.getWord());
                                addFailure("WORKER", word.getWord(), "AI returned null definition");
                            }
                        } finally {
                            workerSemaphore.release();
                        }
                    } catch (Exception e) {
                        log.error("Worker failed for '{}': {}", word.getWord(), e.getMessage());
                        addFailure("WORKER", word.getWord(), e.getMessage());
                    }
                    int done = workerDone.incrementAndGet();
                    updateProgress(PipelineStatus.Step.WORKER, done, actualSize);
                });
            }
        }
        wordRepository.saveAll(words);

        long workerTime = System.currentTimeMillis() - stepStart;
        status = currentStatus.get();
        status.getStepTimings().put("WORKER", workerTime);
        currentStatus.set(status);
        log.info("WORKER complete in {}ms. {} words enriched.", workerTime, actualSize);

        // ======= STEP 2: SHERIFF (Gemini 3.0 Pro) =======
        log.info("=== PIPELINE STEP 2: SHERIFF (Gemini 3.0 Pro) ===");
        stepStart = System.currentTimeMillis();
        updateStep(PipelineStatus.Step.SHERIFF);

        try {
            auditService.auditRecentWords(actualSize, mediaId);
        } catch (Exception e) {
            log.error("Sheriff audit failed: {}", e.getMessage());
            addFailure("SHERIFF", "BATCH", e.getMessage());
        }

        long sheriffTime = System.currentTimeMillis() - stepStart;
        status = currentStatus.get();
        status.getStepTimings().put("SHERIFF", sheriffTime);
        currentStatus.set(status);
        log.info("SHERIFF complete in {}ms.", sheriffTime);

        // ======= STEP 3: SPECIALIST (Claude) =======
        log.info("=== PIPELINE STEP 3: SPECIALIST (Claude) ===");
        stepStart = System.currentTimeMillis();
        updateStep(PipelineStatus.Step.SPECIALIST);

        List<Word> flaggedWords = specialistService.getFlaggedWords("en", mediaId);
        int specialistTotal = flaggedWords.size();
        log.info("Claude Specialist fixing {} words in PARALLEL...", specialistTotal);

        status = currentStatus.get();
        status.setTotalWords(specialistTotal); // Update total words for this step
        status.setProcessedWords(0);
        status.setProgressPercent(0);
        currentStatus.set(status);

        AtomicInteger specialistDone = new AtomicInteger(0);

        try (var specialistExecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (Word word : flaggedWords) {
                specialistExecutor.submit(() -> {
                    try {
                        specialistSemaphore.acquire();
                        try {
                            specialistService.fixSingleWord(word, batchTime);
                        } finally {
                            specialistSemaphore.release();
                        }
                    } catch (Exception e) {
                        log.error("Specialist failed for '{}': {}", word.getWord(), e.getMessage());
                        addFailure("SPECIALIST", word.getWord(), e.getMessage());
                    }
                    int done = specialistDone.incrementAndGet();
                    updateProgress(PipelineStatus.Step.SPECIALIST, done, specialistTotal);
                });
            }
        }

        long specialistTime = System.currentTimeMillis() - stepStart;
        status = currentStatus.get();
        status.getStepTimings().put("SPECIALIST", specialistTime);
        currentStatus.set(status);
        log.info("SPECIALIST complete in {}ms.", specialistTime);

        // ======= STEP 4: JUDGE (GPT-5-mini) — C1/C2 only =======
        log.info("=== PIPELINE STEP 4: JUDGE (GPT-5-mini) ===");
        stepStart = System.currentTimeMillis();
        updateStep(PipelineStatus.Step.JUDGE);

        // Find all C1/C2 words from this batch
        List<Word> judgeQueue = words.stream()
                .filter(w -> w.getIsEnriched() != null && w.getIsEnriched())
                .filter(w -> {
                    String diff = w.getDifficulty();
                    return diff != null && (diff.equalsIgnoreCase("C1") || diff.equalsIgnoreCase("C2"));
                })
                .toList();

        status = currentStatus.get();
        status.setJudgeQueueSize(judgeQueue.size());
        currentStatus.set(status);

        log.info("Judge queue: {} C1/C2 words to evaluate.", judgeQueue.size());

        AtomicInteger judgeDone = new AtomicInteger(0);
        int judgeTotal = judgeQueue.size();

        try (var judgeExecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (Word word : judgeQueue) {
                judgeExecutor.submit(() -> {
                    try {
                        judgeSemaphore.acquire();
                        try {
                            WordDefinition verdict = judgeService.judgeWord(word.getWord(), word.getDefinition());
                            if (verdict != null) {
                                // Auto-apply the judge's verdict immediately
                                word.setJudgeVerdict(verdict);
                                word.setDefinition(verdict);
                                word.setDifficulty(verdict.getDifficulty());
                                word.setJudgeStatus("APPROVED");
                                word.setJudgeApprovedAt(batchTime);
                                word.setEnrichedAt(batchTime);
                                wordRepository.save(word);
                                log.info("Judge verdict auto-applied for '{}'", word.getWord());
                            } else {
                                addFailure("JUDGE", word.getWord(), "GPT-5-mini returned null");
                            }
                        } finally {
                            judgeSemaphore.release();
                        }
                    } catch (Exception e) {
                        log.error("Judge failed for '{}': {}", word.getWord(), e.getMessage());
                        addFailure("JUDGE", word.getWord(), e.getMessage());
                    }
                    int done = judgeDone.incrementAndGet();
                    updateProgress(PipelineStatus.Step.JUDGE, done, judgeTotal);
                });
            }
        }

        long judgeTime = System.currentTimeMillis() - stepStart;
        status = currentStatus.get();
        status.getStepTimings().put("JUDGE", judgeTime);
        currentStatus.set(status);
        log.info("JUDGE complete in {}ms.", judgeTime);

        // ======= COMPLETE =======
        long totalTime = System.currentTimeMillis() - pipelineStart;
        status = currentStatus.get();
        status.setCurrentStep(PipelineStatus.Step.COMPLETE);
        status.setRunning(false);
        status.setCompletedAt(LocalDateTime.now());
        status.setProgressPercent(100);
        status.getStepTimings().put("TOTAL", totalTime);
        currentStatus.set(status);

        log.info("=== PIPELINE COMPLETE === Total time: {}ms. Failed: {} words.",
                totalTime, status.getFailedWords().size());
    }

    private void updateProgress(PipelineStatus.Step step, int done, int total) {
        PipelineStatus status = currentStatus.get();
        status.setCurrentStep(step);
        status.setProcessedWords(done);
        status.setProgressPercent(total > 0 ? (done * 100) / total : 0);
        currentStatus.set(status);
    }

    private void updateStep(PipelineStatus.Step step) {
        PipelineStatus status = currentStatus.get();
        status.setCurrentStep(step);
        currentStatus.set(status);
    }

    private synchronized void addFailure(String step, String word, String error) {
        PipelineStatus status = currentStatus.get();
        status.getFailedWords().add(PipelineStatus.FailedWord.builder()
                .step(step)
                .word(word)
                .error(error)
                .build());
        currentStatus.set(status);
    }

    /**
     * Approves a Judge verdict — applies the judge's proposed definition.
     */
    @Transactional
    public void approveJudgeVerdict(Long wordId) {
        Word word = wordRepository.findById(wordId).orElseThrow();
        if (word.getJudgeVerdict() != null) {
            word.setDefinition(word.getJudgeVerdict());
            word.setDifficulty(word.getJudgeVerdict().getDifficulty());
            word.setJudgeStatus("APPROVED");
            word.setJudgeApprovedAt(LocalDateTime.now());
            word.setEnrichedAt(LocalDateTime.now());
            wordRepository.save(word);
            log.info("Judge verdict APPROVED for '{}'", word.getWord());
        }
    }

    /**
     * Rejects a Judge verdict — keeps the original definition.
     */
    @Transactional
    public void rejectJudgeVerdict(Long wordId) {
        Word word = wordRepository.findById(wordId).orElseThrow();
        word.setJudgeStatus("REJECTED");
        word.setJudgeVerdict(null);
        wordRepository.save(word);
        log.info("Judge verdict REJECTED for '{}'", word.getWord());
    }
}
