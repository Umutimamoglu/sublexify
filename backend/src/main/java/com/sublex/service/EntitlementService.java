package com.sublex.service;

import com.sublex.dto.EntitlementDTO;
import com.sublex.model.Feature;
import com.sublex.model.Plan;
import com.sublex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Single, authoritative read-side for premium entitlement.
 *
 * <p>All gating goes through here — never trust a client flag or a JWT claim
 * (a JWT can outlive an expired/revoked subscription). Reads are backed by a
 * short-TTL in-memory cache so hot paths don't hit the DB on every request;
 * {@link SubscriptionService} calls {@link #invalidate(Long)} on any change so
 * grants/revokes take effect immediately.
 */
@Service
@RequiredArgsConstructor
public class EntitlementService {

    private static final long CACHE_TTL_MILLIS = 15 * 60 * 1000L; // 15 min DB-freshness window

    private final UserRepository userRepository;

    private final ConcurrentHashMap<Long, Snapshot> cache = new ConcurrentHashMap<>();

    /** Cached entitlement snapshot; premium is recomputed live against {@code now}. */
    private record Snapshot(Plan plan, LocalDateTime premiumUntil, long loadedAtMillis) {
        boolean isFresh() {
            return System.currentTimeMillis() - loadedAtMillis < CACHE_TTL_MILLIS;
        }
        boolean isPremiumActive() {
            return plan != null && plan != Plan.FREE
                    && premiumUntil != null && premiumUntil.isAfter(LocalDateTime.now());
        }
    }

    /** True when the user currently holds an active premium entitlement. Anonymous (null) → false. */
    public boolean isPremium(Long userId) {
        if (userId == null) return false;
        return load(userId).isPremiumActive();
    }

    /** The effective plan right now — degrades to FREE once premium has expired. */
    public Plan effectivePlan(Long userId) {
        if (userId == null) return Plan.FREE;
        Snapshot s = load(userId);
        return s.isPremiumActive() ? s.plan() : Plan.FREE;
    }

    /** Resolved feature set for the client so it never hardcodes plan → feature logic. */
    public Set<Feature> featuresFor(Long userId) {
        return featuresForPlan(effectivePlan(userId));
    }

    public Set<Feature> featuresForPlan(Plan plan) {
        if (plan == Plan.PREMIUM) {
            return EnumSet.of(
                    Feature.PREMIUM_CONTENT,
                    Feature.BACKGROUND_PLAYBACK,
                    Feature.LIST_EXPORT);
        }
        return EnumSet.noneOf(Feature.class);
    }

    public boolean hasFeature(Long userId, Feature feature) {
        return featuresFor(userId).contains(feature);
    }

    /** Resolved entitlement description for API responses (app-init cold start). */
    public EntitlementDTO describe(Long userId) {
        Snapshot s = load(userId);
        boolean active = s.isPremiumActive();
        Plan effective = active ? s.plan() : Plan.FREE;
        return EntitlementDTO.builder()
                .plan(effective.name())
                .isPremium(active)
                .premiumUntil(s.premiumUntil())
                .features(featuresForPlan(effective).stream().map(Enum::name).toList())
                .build();
    }

    /** Drop the cached snapshot for a user (called after a grant/revoke/webhook). */
    public void invalidate(Long userId) {
        if (userId != null) cache.remove(userId);
    }

    private Snapshot load(Long userId) {
        Snapshot cached = cache.get(userId);
        if (cached != null && cached.isFresh()) return cached;

        long now = System.currentTimeMillis();
        Snapshot fresh = userRepository.findById(userId)
                .map(u -> new Snapshot(u.getPlan(), u.getPremiumUntil(), now))
                .orElse(new Snapshot(Plan.FREE, null, now));
        cache.put(userId, fresh);
        return fresh;
    }
}
