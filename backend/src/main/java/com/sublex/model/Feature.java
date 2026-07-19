package com.sublex.model;

/**
 * Capability-based feature flags. The client checks {@code features.includes(...)}
 * instead of hardcoding plan → feature logic, so gating stays flexible.
 * Plan → feature mapping lives in {@link com.sublex.service.EntitlementService}.
 */
public enum Feature {
    /** Access to media marked isPremium (locked catalogue). */
    PREMIUM_CONTENT,
    /** Background / lock-screen auto-play TTS of word lists. */
    BACKGROUND_PLAYBACK,
    /** Export word lists to a file (feature ships later; flag reserved). */
    LIST_EXPORT
}
