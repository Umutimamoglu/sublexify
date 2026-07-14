package com.sublex.service;

import com.sublex.model.Word;
import com.sublex.repository.WordRepository;
import com.sublex.util.WordAuditUtil;
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

/**
 * AI Auditor v2 — a smarter second-pass auditor that ROUTES each enriched word
 * into one of four buckets and applies the action live (no schema change):
 * <ul>
 * <li>DELETE    -> problem_found=true (+ reason) -> feeds the existing manual purge review list.</li>
 * <li>RE_ENRICH -> full reset -> WORKER re-enrichment queue (automatic).</li>
 * <li>SHORTEN   -> marked in audit_notes; the existing length-based shortening pipeline handles it.</li>
 * <li>CLEAN     -> step3_error='Clean' (leaves the pending-audit pool).</li>
 * </ul>
 * Reuses the existing {@code findWordsForAuditing} selection (EN, enriched,
 * non-proper-noun, never-audited) so it is idempotent: a processed word either
 * gets a non-null step3_error or becomes is_enriched=false, so it is never re-selected.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditorV2Service {

    private final WordRepository wordRepository;
    private final OpenAIService openAIService;

    /** audit_notes marker for words routed to the shortening bucket. */
    public static final String SHORTEN_NOTE = "Auditor: SHORTEN";
    /** audit_notes marker written when a word is reset for re-enrichment. */
    public static final String REENRICH_NOTE = "Auditor v2: hatalı/eksik çeviri — sıfırlandı";

    @Transactional
    public void auditAndRoute(int limit, BiConsumer<Integer, Integer> progressCallback) {
        log.info("Starting AI Auditor v2 (routing) for {} words", limit);

        List<Word> words = wordRepository.findWordsForAuditing(PageRequest.of(0, limit));
        int total = words.size();
        if (total == 0) {
            log.info("No words found for auditing (v2).");
            return;
        }

        int batchSize = 25; // Route 25 words per call, mirroring v1 auditor's batch size
        AtomicInteger processed = new AtomicInteger(0);
        int[] counts = new int[4]; // [DELETE, RE_ENRICH, SHORTEN, CLEAN]

        for (int i = 0; i < words.size(); i += batchSize) {
            int end = Math.min(i + batchSize, words.size());
            List<Word> batch = words.subList(i, end);

            log.info("Routing batch of {} words...", batch.size());
            Map<String, Map<String, Object>> results = openAIService.auditAndRouteWordsBatch(batch);

            List<Word> tentativeShorten = new ArrayList<>();
            for (Word word : batch) {
                Map<String, Object> result = results.get(word.getWord());
                if (result != null) {
                    String action = String.valueOf(result.get("action")).trim().toUpperCase();
                    String reason = result.get("reason") != null ? String.valueOf(result.get("reason")) : "";
                    applyAction(word, action, reason, counts, tentativeShorten);
                } else {
                    log.warn("Auditor v2 returned no verdict for '{}' — leaving pending.", word.getWord());
                }
                processed.incrementAndGet();
            }

            finalizeShortenVerdicts(tentativeShorten, counts);

            wordRepository.saveAll(batch);
            if (progressCallback != null) {
                progressCallback.accept(processed.get(), total);
            }
        }

        log.info("AI Auditor v2 complete. Routed {} words -> DELETE={}, RE_ENRICH={}, SHORTEN={}, CLEAN={}",
                total, counts[0], counts[1], counts[2], counts[3]);
    }

    private void applyAction(Word word, String action, String reason, int[] counts, List<Word> tentativeShorten) {
        switch (action) {
            case "DELETE" -> {
                // Never auto-deletes: only flags for the manual purge review list.
                word.setProblemFound(true);
                word.setStep3Error(reason.isBlank() ? "Anlamsız/geçersiz kelime (Auditor v2)" : reason);
                counts[0]++;
                log.warn("Auditor v2 DELETE: '{}' - {}", word.getWord(), reason);
            }
            case "RE_ENRICH" -> {
                // Reversible: clears the definition so the WORKER re-enriches it.
                WordAuditUtil.resetForReEnrichment(word, REENRICH_NOTE);
                counts[1]++;
                log.info("Auditor v2 RE_ENRICH (reset): '{}' - {}", word.getWord(), reason);
            }
            case "SHORTEN" ->
                // Not applied yet — needs a second-opinion check first, see finalizeShortenVerdicts().
                tentativeShorten.add(word);
            case "CLEAN" -> {
                word.setProblemFound(false);
                word.setStep3Error("Clean");
                counts[3]++;
            }
            default -> log.warn("Auditor v2 unknown action '{}' for '{}' — leaving pending.", action, word.getWord());
        }
    }

    /**
     * Second-opinion check for SHORTEN verdicts using a distinct model (gpt-5.4).
     * The router's first-pass "too verbose" judgment stays fully AI-driven — this
     * just adds an independent second AI review instead of a code-side length rule,
     * since the router alone showed a high false-positive rate on already-concise
     * definitions (e.g. flagging "Güçlü" or "kuzey" as needing shortening).
     */
    private void finalizeShortenVerdicts(List<Word> tentativeShorten, int[] counts) {
        if (tentativeShorten.isEmpty()) {
            return;
        }

        Map<String, Boolean> verified = openAIService.verifyShortenBatch(tentativeShorten);

        for (Word word : tentativeShorten) {
            // Fail-open on missing/unparseable verdicts: trust the router's original call
            // rather than silently dropping the word back to pending.
            boolean genuinelyVerbose = verified.getOrDefault(word.getWord(), true);

            word.setProblemFound(false);
            word.setStep3Error("Clean");

            if (genuinelyVerbose) {
                word.setAuditNotes(SHORTEN_NOTE);
                counts[2]++;
            } else {
                counts[3]++;
                log.info("Auditor v2 SHORTEN verdict REJECTED by verifier for '{}' — already concise, routed to CLEAN.",
                        word.getWord());
            }
        }
    }
}
