package com.sublex.util;

import com.sublex.model.Word;

/**
 * Shared word-mutation helpers for the audit / enrichment flows.
 * Keeps the "reset for re-enrichment" logic in one place so the admin
 * reset endpoint and the AI Auditor v2 router stay in sync.
 */
public final class WordAuditUtil {

    private WordAuditUtil() {
    }

    /**
     * Fully resets a word so the enrichment WORKER queue picks it up again.
     * Clears the definition and every enrichment/judge/audit flag, then records
     * why it was reset via {@code auditNote}.
     */
    public static void resetForReEnrichment(Word w, String auditNote) {
        w.setDefinition(null);
        w.setIsEnriched(false);
        w.setEnrichedAt(null);
        w.setNeedsReEnrichment(false);
        w.setIsVerified(false);
        w.setJudgeVerdict(null);
        w.setJudgeStatus(null);
        w.setProblemFound(false);
        w.setStep3Error(null);
        w.setAuditNotes(auditNote);
    }
}
