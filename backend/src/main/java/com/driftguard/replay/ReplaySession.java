package com.driftguard.replay;

import com.driftguard.service.RegisteredService;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "replay_sessions")
public class ReplaySession {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private RegisteredService service;

    @Column(name = "staging_url", nullable = false, columnDefinition = "text")
    private String stagingUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private ReplayStatus status = ReplayStatus.PENDING;

    @CreationTimestamp
    @Column(name = "triggered_at", nullable = false, updatable = false)
    private Instant triggeredAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "total_requests", nullable = false)
    private int totalRequests;

    @Column(name = "drifted_count", nullable = false)
    private int driftedCount;

    protected ReplaySession() {
    }

    public ReplaySession(RegisteredService service, String stagingUrl) {
        this.service = service;
        this.stagingUrl = stagingUrl;
    }

    public void markRunning(int totalRequests) {
        this.status = ReplayStatus.RUNNING;
        this.totalRequests = totalRequests;
        this.driftedCount = 0;
    }

    public void markDone(int driftedCount) {
        this.status = ReplayStatus.DONE;
        this.driftedCount = driftedCount;
        this.completedAt = Instant.now();
    }

    public void markFailed() {
        this.status = ReplayStatus.FAILED;
        this.completedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public RegisteredService getService() {
        return service;
    }

    public String getStagingUrl() {
        return stagingUrl;
    }

    public ReplayStatus getStatus() {
        return status;
    }

    public Instant getTriggeredAt() {
        return triggeredAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public int getTotalRequests() {
        return totalRequests;
    }

    public int getDriftedCount() {
        return driftedCount;
    }
}
