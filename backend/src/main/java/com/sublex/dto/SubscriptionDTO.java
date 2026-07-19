package com.sublex.dto;

import com.sublex.model.Subscription;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Subscription history row for the admin panel — excludes the {@link com.sublex.model.User}
 * association (which carries the password hash).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionDTO {
    private Long id;
    private String provider;
    private String plan;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime currentPeriodEnd;
    private LocalDateTime canceledAt;
    private String externalId;
    private Double price;
    private String currency;
    private String invoiceId;
    private String note;
    private LocalDateTime createdAt;

    public static SubscriptionDTO from(Subscription s) {
        return new SubscriptionDTO(
                s.getId(),
                s.getProvider() != null ? s.getProvider().name() : null,
                s.getPlan() != null ? s.getPlan().name() : null,
                s.getStatus() != null ? s.getStatus().name() : null,
                s.getStartedAt(),
                s.getCurrentPeriodEnd(),
                s.getCanceledAt(),
                s.getExternalId(),
                s.getPrice(),
                s.getCurrency(),
                s.getInvoiceId(),
                s.getNote(),
                s.getCreatedAt());
    }
}
