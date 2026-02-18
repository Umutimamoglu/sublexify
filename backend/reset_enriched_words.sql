UPDATE word
SET 
    is_enriched = false,
    is_verified = false,
    needs_re_enrichment = false,
    enriched_at = NULL,
    judge_approved_at = NULL,
    definition = NULL,
    audit_notes = NULL
WHERE is_enriched = true;
