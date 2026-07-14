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
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
@Slf4j
public class PipelineService {

    private final WordRepository wordRepository;
    private final OpenAIService openAIService;
    private final AuditService auditService;
    private final SpecialistService specialistService;
    private final JudgeService judgeService;
    private final GeminiService geminiService;
    private final AuditorService auditorService;
    private final AuditorV2Service auditorV2Service;
    private final DefinitionShorteningService definitionShorteningService;

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
                currentStatus.updateAndGet(s -> s.toBuilder()
                        .currentStep(PipelineStatus.Step.FAILED)
                        .running(false)
                        .completedAt(LocalDateTime.now())
                        .build());
            }
        });
    }

    public void startTrustedEnrichment(int batchSize) {
        if (currentStatus.get().isRunning()) {
            throw new RuntimeException("Pipeline is already running");
        }
        Thread.startVirtualThread(() -> {
            try {
                runTrustedEnrichment(batchSize);
            } catch (Exception e) {
                log.error("Trusted enrichment failed: {}", e.getMessage(), e);
                currentStatus.updateAndGet(s -> s.toBuilder()
                        .currentStep(PipelineStatus.Step.FAILED)
                        .running(false)
                        .completedAt(LocalDateTime.now())
                        .build());
            }
        });
    }

    private void runPipeline(int batchSize, Long mediaId) {
        long pipelineStart = System.currentTimeMillis();

        // ======= STEP 1: WORKER (OpenAI gpt-5.4-mini) =======
        log.info("=== PIPELINE STEP 1: WORKER (OpenAI gpt-5.4-mini) via OpenAIService ===");
        long stepStart = System.currentTimeMillis();

        List<Word> words = (mediaId == null)
                ? wordRepository
                        .findPendingEnrichmentWithLimit(org.springframework.data.domain.PageRequest.of(0, batchSize))
                : wordRepository.findPendingEnrichmentByMediaId(mediaId,
                        org.springframework.data.domain.PageRequest.of(0, batchSize));
        int actualSize = words.size();

        currentStatus.updateAndGet(s -> s.withTotalWords(actualSize));

        if (words.isEmpty()) {
            log.info("No pending words to enrich. Pipeline complete.");
            currentStatus.updateAndGet(s -> s.toBuilder()
                    .currentStep(PipelineStatus.Step.COMPLETE)
                    .running(false)
                    .completedAt(LocalDateTime.now())
                    .build());
            return;
        }

        LocalDateTime batchTime = LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        AtomicInteger workerDone = new AtomicInteger(0);

        List<Word> properNouns = words.stream().filter(w -> Boolean.TRUE.equals(w.getIsProperNoun())).toList();
        List<Word> wordsToProcess = words.stream().filter(w -> !Boolean.TRUE.equals(w.getIsProperNoun())).toList();

        if (!properNouns.isEmpty()) {
            log.info("Bypassing AI for {} proper nouns and marking as APPROVED.", properNouns.size());
            for (Word word : properNouns) {
                com.sublex.model.WordDefinition def = new com.sublex.model.WordDefinition();
                def.setWord(word.getWord());
                def.setDifficulty("A1");
                com.sublex.model.WordDefinition.Meaning meaning = new com.sublex.model.WordDefinition.Meaning();
                meaning.setPos("proper noun");
                meaning.setDefinition("A proper noun (Name, Place, etc.)");
                meaning.setExample(word.getContextSentence() != null ? word.getContextSentence() : "");
                def.getMeanings().add(meaning);

                word.setDefinition(def);
                word.setDifficulty("A1");
                word.setIsEnriched(true);
                word.setNeedsReEnrichment(false);
                word.setIsVerified(true); // Bypass Sheriff
                word.setJudgeStatus("APPROVED"); // Bypass Judge
                word.setAuditNotes("Auto-approved proper noun. Bypassed AI pipeline.");
                word.setEnrichedAt(batchTime);
            }
            // properNouns are part of `words` list, which gets saved at the end of WORKER
            // step.
        }

        // ======= STEP 1: WORKER (Batch Enrichment) =======
        updateStep(PipelineStatus.Step.WORKER);

        int workerBatchSize = 25;
        List<List<Word>> workerBatches = new ArrayList<>();
        for (int i = 0; i < wordsToProcess.size(); i += workerBatchSize) {
            int end = Math.min(i + workerBatchSize, wordsToProcess.size());
            workerBatches.add(new ArrayList<>(wordsToProcess.subList(i, end)));
        }

        log.info("Worker splitting into {} parallel batches of {} words.", workerBatches.size(), workerBatchSize);

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (List<Word> batch : workerBatches) {
                executor.submit(() -> {
                    try {
                        workerSemaphore.acquire();
                        try {
                            log.info("Worker batch processing: {} words", batch.size());
                            Map<String, WordDefinition> batchedResults = openAIService.enrichWordsBatch(batch);
                            log.info("Worker batch results: {} definitions returned", batchedResults.size());

                            for (Word word : batch) {
                                WordDefinition def = batchedResults.get(word.getWord());
                                if (def != null) {
                                    String rootWordName = def.getWord();
                                    if (rootWordName != null && !word.getWord().equalsIgnoreCase(rootWordName)) {
                                        // Potential rename, check for conflict
                                        java.util.Optional<Word> existingRoot = wordRepository.findByWordAndLanguage(
                                                rootWordName,
                                                word.getLanguage());
                                        if (existingRoot.isPresent()
                                                && !existingRoot.get().getId().equals(word.getId())) {
                                            log.info(
                                                    "Root word '{}' already exists (ID: {}). Linking instead of renaming.",
                                                    rootWordName, existingRoot.get().getId());
                                            word.setRootWord(existingRoot.get());
                                            // Keep original word string to avoid duplicate key violation
                                        } else {
                                            word.setWord(rootWordName);
                                        }
                                    }
                                    word.setDefinition(def);
                                    word.setDifficulty(def.getDifficulty());
                                    word.setIsEnriched(true);
                                    word.setNeedsReEnrichment(false);
                                    word.setAuditNotes(null);
                                    word.setEnrichedAt(batchTime);
                                } else {
                                    log.warn("Worker returned NULL definition for word: {}", word.getWord());
                                }
                            }
                        } finally {
                            workerSemaphore.release();
                        }
                    } catch (Exception e) {
                        log.error("Batch worker failed: {}", e.getMessage());
                    }
                    int done = workerDone.addAndGet(batch.size());

                    updateProgress(PipelineStatus.Step.WORKER, done, actualSize);
                });
            }
        }
        wordRepository.saveAll(words);

        long workerTime = System.currentTimeMillis() - stepStart;
        currentStatus.updateAndGet(s -> {
            Map<String, Long> timings = new HashMap<>(s.getStepTimings());
            timings.put("WORKER", workerTime);
            return s.withStepTimings(timings);
        });
        log.info("WORKER complete in {}ms. {} words enriched.", workerTime, actualSize);

        // ======= STEP 2: SHERIFF (OpenAI gpt-5.4-mini; useGPT5=true always -> Gemini path unused) =======
        log.info("=== PIPELINE STEP 2: SHERIFF (OpenAI gpt-5.4-mini) ===");
        stepStart = System.currentTimeMillis();

        updateStep(PipelineStatus.Step.SHERIFF);
        currentStatus.updateAndGet(s -> s.toBuilder()
                .processedWords(0)
                .progressPercent(0)
                .build());

        try {
            List<Word> wordsToAudit = words.stream()
                    .filter(w -> !Boolean.TRUE.equals(w.getIsVerified()))
                    .filter(w -> w.getDefinition() != null)
                    .toList();

            auditService.auditSpecificWords(wordsToAudit, (done, total) -> {
                updateProgress(PipelineStatus.Step.SHERIFF, done, total);
            }, true);
        } catch (Exception e) {
            log.error("Sheriff audit failed: {}", e.getMessage());
            addFailure("SHERIFF", "BATCH", e.getMessage());
        }

        long sheriffTime = System.currentTimeMillis() - stepStart;
        currentStatus.updateAndGet(s -> {
            Map<String, Long> timings = new HashMap<>(s.getStepTimings());
            timings.put("SHERIFF", sheriffTime);
            return s.withStepTimings(timings);
        });
        log.info("SHERIFF complete in {}ms.", sheriffTime);

        // ======= STEP 3: SPECIALIST (OpenAI gpt-5.4-mini) =======
        log.info("=== PIPELINE STEP 3: SPECIALIST (OpenAI gpt-5.4-mini) ===");
        stepStart = System.currentTimeMillis();
        updateStep(PipelineStatus.Step.SPECIALIST);

        List<Word> flaggedWords = words.stream()
                .filter(w -> Boolean.TRUE.equals(w.getIsEnriched()) && Boolean.TRUE.equals(w.getNeedsReEnrichment()))
                .toList();
        
        int specialistTotal = flaggedWords.size();
        log.info("Gemini Specialist fixing {} words in PARALLEL...", specialistTotal);

        currentStatus.updateAndGet(s -> s.toBuilder()
                .totalWords(specialistTotal)
                .processedWords(0)
                .progressPercent(0)
                .build());

        AtomicInteger specialistDone = new AtomicInteger(0);

        int specialistBatchSize = 5;
        List<List<Word>> specialistBatches = new ArrayList<>();
        for (int i = 0; i < flaggedWords.size(); i += specialistBatchSize) {
            int end = Math.min(i + specialistBatchSize, flaggedWords.size());
            specialistBatches.add(new ArrayList<>(flaggedWords.subList(i, end)));
        }

        log.info("Specialist splitting into {} parallel batches of {} words.", specialistBatches.size(),
                specialistBatchSize);

        try (var specialistExecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (List<Word> batch : specialistBatches) {
                specialistExecutor.submit(() -> {
                    try {
                        specialistSemaphore.acquire();
                        try {
                            specialistService.fixWordsBatch(batch, batchTime);
                        } finally {
                            specialistSemaphore.release();
                        }
                    } catch (Exception e) {
                        log.error("Specialist batch failed: {}", e.getMessage());
                    }
                    int done = specialistDone.addAndGet(batch.size());
                    updateProgress(PipelineStatus.Step.SPECIALIST, done, specialistTotal);
                });
            }
        }

        long specialistTime = System.currentTimeMillis() - stepStart;
        currentStatus.updateAndGet(s -> {
            Map<String, Long> timings = new HashMap<>(s.getStepTimings());
            timings.put("SPECIALIST", specialistTime);
            return s.withStepTimings(timings);
        });
        log.info("SPECIALIST complete in {}ms.", specialistTime);

        // ======= STEP 4: JUDGE (GPT-5-mini) — C1/C2 only =======
        log.info("=== PIPELINE STEP 4: JUDGE (GPT-5-mini) ===");
        stepStart = System.currentTimeMillis();
        updateStep(PipelineStatus.Step.JUDGE);

        // Ensure we only judge words processed in this specific pipeline run
        List<Word> judgeQueue = words.stream()
                .filter(w -> Boolean.TRUE.equals(w.getIsEnriched()))
                .filter(w -> {
                    String diff = w.getDifficulty();
                    return diff != null && (diff.equalsIgnoreCase("C1") || diff.equalsIgnoreCase("C2"));
                })
                .toList();

        currentStatus.updateAndGet(s -> s.withJudgeQueueSize(judgeQueue.size()));

        log.info("Judge queue: {} C1/C2 words to evaluate in BATCHES.", judgeQueue.size());

        AtomicInteger judgeDone = new AtomicInteger(0);
        int judgeTotal = judgeQueue.size();

        // Batch Judge: 10 words parallel via individual judgeWord calls
        int judgeBatchSize = 10;
        List<List<Word>> judgeBatches = new ArrayList<>();
        for (int i = 0; i < judgeQueue.size(); i += judgeBatchSize) {
            int end = Math.min(i + judgeBatchSize, judgeQueue.size());
            judgeBatches.add(new ArrayList<>(judgeQueue.subList(i, end)));
        }

        log.info("Judge splitting into {} parallel batches of {} words.", judgeBatches.size(), judgeBatchSize);

        try (var judgeExecutor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (List<Word> batch : judgeBatches) {
                judgeExecutor.submit(() -> {
                    for (Word word : batch) {
                        try {
                            judgeSemaphore.acquire();
                            try {
                                WordDefinition verdict = judgeService.judgeWord(word, word.getDefinition());
                                if (verdict != null) {
                                    word.setJudgeVerdict(verdict);
                                    word.setDefinition(verdict);
                                    word.setDifficulty(verdict.getDifficulty());
                                    word.setJudgeStatus("APPROVED");
                                    word.setJudgeApprovedAt(batchTime);
                                    word.setEnrichedAt(batchTime);
                                    wordRepository.save(word);
                                    log.info("Judge verdict auto-applied for '{}'", word.getWord());
                                } else {
                                    addFailure("JUDGE", word.getWord(), "GPT-5-mini returned null for this word");
                                }
                            } finally {
                                judgeSemaphore.release();
                            }
                        } catch (Exception e) {
                            log.error("Judge failed for word '{}': {}", word.getWord(), e.getMessage());
                            addFailure("JUDGE", word.getWord(), e.getMessage());
                        }
                        int done = judgeDone.incrementAndGet();
                        updateProgress(PipelineStatus.Step.JUDGE, done, judgeTotal);
                    }
                });
            }
        }

        long judgeTime = System.currentTimeMillis() - stepStart;
        currentStatus.updateAndGet(s -> {
            Map<String, Long> timings = new HashMap<>(s.getStepTimings());
            timings.put("JUDGE", judgeTime);
            return s.withStepTimings(timings);
        });
        log.info("JUDGE complete in {}ms.", judgeTime);

        // ======= COMPLETE =======
        long totalTime = System.currentTimeMillis() - pipelineStart;
        currentStatus.updateAndGet(s -> {
            Map<String, Long> timings = new HashMap<>(s.getStepTimings());
            timings.put("TOTAL", totalTime);
            return s.toBuilder()
                    .currentStep(PipelineStatus.Step.COMPLETE)
                    .running(false)
                    .completedAt(LocalDateTime.now())
                    .progressPercent(100)
                    .stepTimings(timings)
                    .build();
        });

        PipelineStatus finalStatus = currentStatus.get();
        log.info("=== PIPELINE COMPLETE === Total time: {}ms. Failed: {} words.",
                totalTime, finalStatus.getFailedWords().size());
    }

    private void updateProgress(PipelineStatus.Step step, int done, int total) {
        currentStatus.updateAndGet(status -> status.toBuilder()
                .currentStep(step)
                .processedWords(done)
                .progressPercent(total > 0 ? (done * 100) / total : 0)
                .build());
    }

    private void updateStep(PipelineStatus.Step step) {
        currentStatus.updateAndGet(status -> status.withCurrentStep(step));
    }

    private void addFailure(String step, String word, String error) {
        currentStatus.updateAndGet(status -> {
            var newFailures = new ArrayList<>(status.getFailedWords());
            newFailures.add(PipelineStatus.FailedWord.builder()
                    .step(step)
                    .word(word)
                    .error(error)
                    .build());
            return status.toBuilder().failedWords(newFailures).build();
        });
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

    private void runTrustedEnrichment(int batchSize) {
        long pipelineStart = System.currentTimeMillis();
        log.info("=== STARTING TRUSTED ENRICHMENT (Oxford) ===");

        List<Word> words = wordRepository
                .findPendingTrustedEnrichment(org.springframework.data.domain.PageRequest.of(0, batchSize));
        int total = words.size();

        if (words.isEmpty()) {
            log.info("No words found for trusted enrichment.");
            currentStatus.updateAndGet(s -> s.toBuilder()
                    .currentStep(PipelineStatus.Step.COMPLETE)
                    .running(false)
                    .build());
            return;
        }

        currentStatus.set(PipelineStatus.builder()
                .running(true)
                .totalWords(total)
                .processedWords(0)
                .currentStep(PipelineStatus.Step.TRUSTED_ENRICHMENT)
                .startedAt(LocalDateTime.now())
                .build());

        LocalDateTime batchTime = LocalDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.SECONDS);
        AtomicInteger doneCount = new AtomicInteger(0);

        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (Word word : words) {
                executor.submit(() -> {
                    try {
                        workerSemaphore.acquire();
                        try {
                            WordDefinition def = openAIService.enrichTrustedWord(word.getWord(), word.getDifficulty(),
                                    word.getContextSentence());
                            if (def != null) {
                                word.setDefinition(def);
                                word.setDifficulty(def.getDifficulty());
                                word.setIsEnriched(true);
                                word.setEnrichedAt(batchTime);
                                word.setAuditNotes("Trusted Enrichment (Oxford)");

                                // ======= AD-HOC JUDGE STEP FOR C1/C2 OXFORD WORDS =======
                                if ("C1".equalsIgnoreCase(word.getDifficulty())
                                        || "C2".equalsIgnoreCase(word.getDifficulty())) {
                                    log.info("Applying Judge to high-level Oxford word: {}", word.getWord());
                                    WordDefinition judgeDef = judgeService.judgeWord(word,
                                            word.getDefinition());
                                    if (judgeDef != null) {
                                        // Oxford olduğu için Judge sonucunu doğrudan 'APPROVED' olarak kabul edebiliriz
                                        // veya 'PENDING_REVIEW' yapabiliriz. Plan gereği Judge üzerinden geçsin.
                                        word.setJudgeVerdict(judgeDef);
                                        word.setJudgeStatus("PENDING_REVIEW");
                                    }
                                } else {
                                    word.setIsVerified(true); // A1-B2 ise doğrudan verified say
                                }

                                wordRepository.save(word);
                            }
                        } finally {
                            workerSemaphore.release();
                        }
                    } catch (Exception e) {
                        log.error("Trusted enrichment failed for '{}': {}", word.getWord(), e.getMessage());
                        addFailure("TRUSTED_ENRICHMENT", word.getWord(), e.getMessage());
                    }
                    int done = doneCount.incrementAndGet();
                    updateProgress(PipelineStatus.Step.TRUSTED_ENRICHMENT, done, total);
                });
            }
        }

        long totalTime = System.currentTimeMillis() - pipelineStart;
        currentStatus.updateAndGet(s -> s.toBuilder()
                .currentStep(PipelineStatus.Step.COMPLETE)
                .running(false)
                .completedAt(LocalDateTime.now())
                .progressPercent(100)
                .build());

        log.info("=== TRUSTED ENRICHMENT COMPLETE === Total time: {}ms", totalTime);
    }

    public void startAuditor(int limit) {
        if (currentStatus.get().isRunning()) {
            throw new RuntimeException("Pipeline is already running");
        }
        PipelineStatus initial = PipelineStatus.builder()
                .currentStep(PipelineStatus.Step.AUDITOR)
                .totalWords(limit)
                .processedWords(0)
                .running(true)
                .startedAt(LocalDateTime.now())
                .build();
        currentStatus.set(initial);

        Thread.startVirtualThread(() -> {
            try {
                long start = System.currentTimeMillis();
                auditorService.auditRecentWords(limit, (done, total) -> {
                    updateProgress(PipelineStatus.Step.AUDITOR, done, total);
                });
                long duration = System.currentTimeMillis() - start;
                
                currentStatus.updateAndGet(s -> s.toBuilder()
                        .currentStep(PipelineStatus.Step.COMPLETE)
                        .running(false)
                        .completedAt(LocalDateTime.now())
                        .progressPercent(100)
                        .build());
                log.info("=== AUDITOR COMPLETE === Total time: {}ms", duration);
            } catch (Exception e) {
                log.error("Auditor failed: {}", e.getMessage(), e);
                currentStatus.updateAndGet(s -> s.toBuilder()
                        .currentStep(PipelineStatus.Step.FAILED)
                        .running(false)
                        .completedAt(LocalDateTime.now())
                        .build());
            }
        });
    }

    /**
     * AI Auditor v2 — smart router. Classifies each pending-audit word into
     * DELETE / RE_ENRICH / SHORTEN / CLEAN and applies the action live.
     * Reuses the existing AUDITOR step for UI display.
     */
    public void startAuditorV2(int limit) {
        if (currentStatus.get().isRunning()) {
            throw new RuntimeException("Pipeline is already running");
        }
        PipelineStatus initial = PipelineStatus.builder()
                .currentStep(PipelineStatus.Step.AUDITOR)
                .totalWords(limit)
                .processedWords(0)
                .running(true)
                .startedAt(LocalDateTime.now())
                .build();
        currentStatus.set(initial);

        Thread.startVirtualThread(() -> {
            try {
                long start = System.currentTimeMillis();
                auditorV2Service.auditAndRoute(limit, (done, total) -> {
                    updateProgress(PipelineStatus.Step.AUDITOR, done, total);
                });
                long duration = System.currentTimeMillis() - start;

                currentStatus.updateAndGet(s -> s.toBuilder()
                        .currentStep(PipelineStatus.Step.COMPLETE)
                        .running(false)
                        .completedAt(LocalDateTime.now())
                        .progressPercent(100)
                        .build());
                log.info("=== AUDITOR v2 COMPLETE === Total time: {}ms", duration);
            } catch (Exception e) {
                log.error("Auditor v2 failed: {}", e.getMessage(), e);
                currentStatus.updateAndGet(s -> s.toBuilder()
                        .currentStep(PipelineStatus.Step.FAILED)
                        .running(false)
                        .completedAt(LocalDateTime.now())
                        .build());
            }
        });
    }

    public void startDefinitionShortening(int limit) {
        if (currentStatus.get().isRunning()) {
            throw new RuntimeException("Pipeline is already running");
        }
        PipelineStatus initial = PipelineStatus.builder()
                .currentStep(PipelineStatus.Step.DEFINITION_SHORTENING)
                .totalWords(limit)
                .processedWords(0)
                .running(true)
                .startedAt(LocalDateTime.now())
                .build();
        currentStatus.set(initial);

        Thread.startVirtualThread(() -> {
            try {
                long start = System.currentTimeMillis();
                definitionShorteningService.shortenDefinitions(limit, (done, total) -> {
                    updateProgress(PipelineStatus.Step.DEFINITION_SHORTENING, done, total);
                });
                long duration = System.currentTimeMillis() - start;

                currentStatus.updateAndGet(s -> s.toBuilder()
                        .currentStep(PipelineStatus.Step.COMPLETE)
                        .running(false)
                        .completedAt(LocalDateTime.now())
                        .progressPercent(100)
                        .build());
                log.info("=== DEFINITION SHORTENING COMPLETE === Total time: {}ms", duration);
            } catch (Exception e) {
                log.error("Definition shortening failed: {}", e.getMessage(), e);
                currentStatus.updateAndGet(s -> s.toBuilder()
                        .currentStep(PipelineStatus.Step.FAILED)
                        .running(false)
                        .completedAt(LocalDateTime.now())
                        .build());
            }
        });
    }
}
