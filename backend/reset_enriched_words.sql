UPDATE word
SET 
  is_enriched = false,
  definition = null,
  enriched_at = null,
  audit_notes = null,
  judge_status = null,
  needs_re_enrichment = false,  -- Clean slate
  is_verified = false
WHERE is_enriched = true;
