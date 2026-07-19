package com.sublex.model;

/**
 * Where an entitlement came from. Phase 1 only writes MANUAL rows (admin grant);
 * Phase 2 payment webhooks (Stripe / Apple / Google) reuse the same write-path.
 */
public enum SubscriptionProvider {
    MANUAL,
    STRIPE,
    APPLE,
    GOOGLE
}
