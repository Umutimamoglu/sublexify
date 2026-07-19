package com.sublex.model;

/**
 * Lifecycle state of a subscription row.
 * GRACE = payment provider is retrying but access is still granted (Phase 2).
 */
public enum SubscriptionStatus {
    ACTIVE,
    CANCELED,
    EXPIRED,
    GRACE
}
