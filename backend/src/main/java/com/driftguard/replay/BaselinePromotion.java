package com.driftguard.replay;

import com.driftguard.service.RegisteredService;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "baseline_promotions")
public class BaselinePromotion {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ReplaySession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private RegisteredService service;

    @Column(name = "promoted_by", nullable = false)
    private String promotedBy;

    @Column(columnDefinition = "text")
    private String note;

    @Column(name = "promoted_count", nullable = false)
    private int promotedCount;

    @Column(nullable = false)
    private boolean forced;

    @CreationTimestamp
    @Column(name = "promoted_at", nullable = false, updatable = false)
    private Instant promotedAt;

    protected BaselinePromotion() {
    }

    public BaselinePromotion(
            ReplaySession session,
            RegisteredService service,
            String promotedBy,
            String note,
            int promotedCount,
            boolean forced
    ) {
        this.session = session;
        this.service = service;
        this.promotedBy = promotedBy;
        this.note = note;
        this.promotedCount = promotedCount;
        this.forced = forced;
    }

    public UUID getId() {
        return id;
    }

    public ReplaySession getSession() {
        return session;
    }

    public RegisteredService getService() {
        return service;
    }

    public String getPromotedBy() {
        return promotedBy;
    }

    public String getNote() {
        return note;
    }

    public int getPromotedCount() {
        return promotedCount;
    }

    public boolean isForced() {
        return forced;
    }

    public Instant getPromotedAt() {
        return promotedAt;
    }
}
