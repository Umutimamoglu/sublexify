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
 * into one of five buckets and applies the action live (no schema change):
 * <ul>
 * <li>PROPER_NOUN -> is_proper_noun=true (keeps the existing definition) -> a word that
 *     slipped through analysis without being flagged as a name-only entry gets fixed.</li>
 * <li>DELETE      -> problem_found=true (+ reason) -> feeds the existing manual purge review list.</li>
 * <li>RE_ENRICH   -> full reset -> WORKER re-enrichment queue (automatic).</li>
 * <li>SHORTEN     -> marked in audit_notes; the existing length-based shortening pipeline handles it.</li>
 * <li>CLEAN       -> step3_error='Clean' (leaves the pending-audit pool).</li>
 * </ul>
 * Reuses the existing {@code findWordsForAuditing} selection (EN, enriched,
 * non-proper-noun, never-audited) so it is idempotent: a processed word either
 * gets a non-null step3_error, becomes is_enriched=false, or becomes is_proper_noun=true,
 * so it is never re-selected.
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
    /** audit_notes marker written when a word is reclassified as a proper noun. */
    public static final String PROPER_NOUN_NOTE = "Auditor v2: özel isim olarak işaretlendi";

    @Transactional
    public void auditAndRoute(int limit, BiConsumer<Integer, Integer> progressCallback) {
        log.info("Starting AI Auditor v2 (routing) for {} words", limit);

        List<Word> words = wordRepository.findWordsForReAudit(PageRequest.of(0, limit));
        int total = words.size();
        if (total == 0) {
            log.info("No words found for auditing (v2).");
            return;
        }

        int batchSize = 25; // Route 25 words per call, mirroring v1 auditor's batch size
        AtomicInteger processed = new AtomicInteger(0);
        int[] counts = new int[6]; // [DELETE, RE_ENRICH, SHORTEN, CLEAN, PROPER_NOUN, RE_ENRICH_SKIPPED_NO_REASON]

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

        log.info("AI Auditor v2 complete. Routed {} words -> DELETE={}, RE_ENRICH={}, SHORTEN={}, CLEAN={}, PROPER_NOUN={}, RE_ENRICH_SKIPPED_NO_REASON={}",
                total, counts[0], counts[1], counts[2], counts[3], counts[4], counts[5]);
    }

    private void applyAction(Word word, String action, String reason, int[] counts, List<Word> tentativeShorten) {
        switch (action) {
            case "PROPER_NOUN" -> {
                // Reuses the same mutation as the existing /words/mark-proper-noun
                // endpoint — the definition is left untouched (a name doesn't need a
                // fabricated dictionary meaning). This word slipped through analysis
                // without being flagged is_proper_noun=true; only the classification
                // is fixed. Matches the permanent-note precedent already used by the
                // WORKER's own proper-noun bypass path.
                word.setIsProperNoun(true);
                word.setProblemFound(false);
                word.setStep3Error("Clean");
                word.setAuditNotes(PROPER_NOUN_NOTE);
                stamp(word, "PROPER_NOUN");
                counts[4]++;
                log.info("Auditor v2 PROPER_NOUN: '{}' marked is_proper_noun=true - {}", word.getWord(), reason);
            }
            case "DELETE" -> {
                // Never auto-deletes: only flags for the manual purge review list.
                word.setProblemFound(true);
                word.setStep3Error(reason.isBlank() ? "Anlamsız/geçersiz kelime (Auditor v2)" : reason);
                stamp(word, "DELETE");
                counts[0]++;
                log.warn("Auditor v2 DELETE: '{}' - {}", word.getWord(), reason);
            }
            case "RE_ENRICH" -> {
                if (reason.isBlank()) {
                    // Strict mode: RE_ENRICH wipes the current definition immediately, so an
                    // unauditable verdict (no reason) would destroy the only evidence needed
                    // to later check whether the AI was right — worse than just leaving the
                    // word pending. Skip (no auditedAt stamp); it stays pending and is
                    // re-selected next run.
                    counts[5]++;
                    log.warn("Auditor v2 RE_ENRICH SKIPPED for '{}' — no reason provided, leaving pending.",
                            word.getWord());
                } else {
                    // Reversible: clears the definition so the WORKER re-enriches it. The
                    // AI's reason is kept in audit_notes so it stays inspectable until
                    // re-enrichment succeeds — WORKER (and the trusted-enrichment path)
                    // already overwrite audit_notes on success, so this never lingers as
                    // permanent clutter once the word is re-enriched. auditedAt is stamped
                    // so the re-enriched word is not re-audited in this pass (no loop).
                    WordAuditUtil.resetForReEnrichment(word, REENRICH_NOTE + ": " + reason);
                    stamp(word, "RE_ENRICH");
                    counts[1]++;
                    log.info("Auditor v2 RE_ENRICH (reset): '{}' - {}", word.getWord(), reason);
                }
            }
            case "SHORTEN" ->
                // Not applied yet — needs a second-opinion check first, see finalizeShortenVerdicts().
                tentativeShorten.add(word);
            case "CLEAN" -> {
                word.setProblemFound(false);
                word.setStep3Error("Clean");
                stamp(word, "CLEAN");
                counts[3]++;
            }
            default -> log.warn("Auditor v2 unknown action '{}' for '{}' — leaving pending.", action, word.getWord());
        }
    }

    /** Records the permanent v2 routing decision + timestamp (Phase 2). */
    private void stamp(Word word, String action) {
        word.setAuditAction(action);
        word.setAuditedAt(java.time.LocalDateTime.now());
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
                stamp(word, "SHORTEN");
                counts[2]++;
            } else {
                stamp(word, "CLEAN");
                counts[3]++;
                log.info("Auditor v2 SHORTEN verdict REJECTED by verifier for '{}' — already concise, routed to CLEAN.",
                        word.getWord());
            }
        }
    }
}
