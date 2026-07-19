package com.sublex.model;

/**
 * Subscription plan tier. Kept as an enum (not a boolean) so new tiers
 * (PRO, LIFETIME, ...) can be added later without a schema/refactor.
 * FREE is the default for every user.
 */
public enum Plan {
    FREE,
    PREMIUM
}
