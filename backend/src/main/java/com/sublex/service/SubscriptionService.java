package com.sublex.service;

import com.sublex.model.Plan;
import com.sublex.model.Subscription;
import com.sublex.model.SubscriptionProvider;
import com.sublex.model.SubscriptionStatus;
import com.sublex.model.User;
import com.sublex.repository.SubscriptionRepository;
import com.sublex.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * The single write-path for premium entitlements.
 *
 * <p>Phase 1: the admin panel calls {@link #grantManual}. Phase 2: Stripe /
 * Apple / Google webhooks will call {@link #applyEntitlement} with the same
 * signature — so adding real payments requires no change to gating or to the
 * user model. Every change writes a {@link Subscription} history row and
 * refreshes the denormalized {@link User} fast-read fields.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SubscriptionService {

    /** Sentinel for "no expiry" (lifetime) — stored as a far-future date. */
    private static final LocalDateTime LIFETIME = LocalDateTime.of(2099, 12, 31, 23, 59, 59);

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final EntitlementService entitlementService;

    /**
     * Apply an entitlement to a user. Supersedes any currently-active row,
     * appends a new ACTIVE history row, and updates the user's fast-read fields.
     *
     * @param until entitlement end; null means lifetime.
     */
    @Transactional
    public Subscription applyEntitlement(Long userId, Plan plan, SubscriptionProvider provider,
                                         LocalDateTime until, String externalRef, String note) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        LocalDateTime now = LocalDateTime.now();
        supersedeActive(userId, SubscriptionStatus.EXPIRED, now);

        Subscription sub = Subscription.builder()
                .user(user)
                .provider(provider)
                .plan(plan)
                .status(SubscriptionStatus.ACTIVE)
                .startedAt(now)
                .currentPeriodEnd(until)
                .externalId(externalRef)
                .note(note)
                .build();
        sub = subscriptionRepository.save(sub);

        user.setPlan(plan);
        user.setPremiumUntil(until);
        if (user.getPremiumSince() == null) {
            user.setPremiumSince(now);
        }
        userRepository.save(user);

        entitlementService.invalidate(userId);
        log.info("Entitlement applied: user={} plan={} provider={} until={}", userId, plan, provider, until);
        return sub;
    }

    /** Admin manual grant. {@code days <= 0} or {@code lifetime=true} grants lifetime access. */
    @Transactional
    public Subscription grantManual(Long userId, int days, boolean lifetime, String note) {
        LocalDateTime until = (lifetime || days <= 0)
                ? LIFETIME
                : LocalDateTime.now().plusDays(days);
        return applyEntitlement(userId, Plan.PREMIUM, SubscriptionProvider.MANUAL, until, null, note);
    }

    /** Revoke premium immediately: cancel active rows and reset the user to FREE. */
    @Transactional
    public void revoke(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        supersedeActive(userId, SubscriptionStatus.CANCELED, LocalDateTime.now());

        user.setPlan(Plan.FREE);
        user.setPremiumUntil(null);
        userRepository.save(user);

        entitlementService.invalidate(userId);
        log.info("Entitlement revoked: user={}", userId);
    }

    /** Full subscription history for a user, newest first. */
    public List<Subscription> getHistory(Long userId) {
        return subscriptionRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /** Derived, client-ready membership detail for the profile screen. */
    public com.sublex.dto.MembershipDTO getMembership(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        boolean premium = user.isPremiumActive();
        LocalDateTime until = user.getPremiumUntil();
        // LIFETIME grants are stored as a far-future sentinel (year 2099) or null
        boolean lifetime = premium && (until == null || until.getYear() >= 2099);

        Integer daysLeft = null;
        if (premium && !lifetime && until != null) {
            long days = java.time.Duration.between(LocalDateTime.now(), until).toDays();
            daysLeft = (int) Math.max(0, days) + (until.isAfter(LocalDateTime.now()) ? 1 : 0);
        }

        // Most recent active subscription carries the provenance (provider / note / start).
        Subscription active = subscriptionRepository
                .findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE)
                .stream()
                .max(java.util.Comparator.comparing(Subscription::getCreatedAt))
                .orElse(null);

        SubscriptionProvider provider = active != null ? active.getProvider() : null;

        return com.sublex.dto.MembershipDTO.builder()
                .isPremium(premium)
                .plan((premium ? Plan.PREMIUM : Plan.FREE).name())
                .source(provider != null ? provider.name() : null)
                .sourceLabel(sourceLabel(provider))
                .billingInterval(null) // Phase 2: derived from the paid plan
                .lifetime(lifetime)
                .startedAt(user.getPremiumSince() != null ? user.getPremiumSince()
                        : (active != null ? active.getStartedAt() : null))
                .premiumUntil(lifetime ? null : (premium ? until : null))
                .daysLeft(daysLeft)
                .note(active != null ? active.getNote() : null)
                .build();
    }

    private String sourceLabel(SubscriptionProvider provider) {
        if (provider == null) return null;
        return switch (provider) {
            case MANUAL -> "Yönetici tarafından tanımlandı";
            case STRIPE -> "Web aboneliği (kart)";
            case APPLE -> "App Store aboneliği";
            case GOOGLE -> "Google Play aboneliği";
        };
    }

    private void supersedeActive(Long userId, SubscriptionStatus newStatus, LocalDateTime at) {
        List<Subscription> actives = subscriptionRepository.findByUserIdAndStatus(userId, SubscriptionStatus.ACTIVE);
        for (Subscription s : actives) {
            s.setStatus(newStatus);
            s.setCanceledAt(at);
        }
        if (!actives.isEmpty()) {
            subscriptionRepository.saveAll(actives);
        }
    }
}
