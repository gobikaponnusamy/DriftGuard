package com.driftguard.replay;

import com.driftguard.common.DriftType;
import com.driftguard.recorder.Baseline;
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
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "replay_results")
public class ReplayResult {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private ReplaySession session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "baseline_id", nullable = false)
    private Baseline baseline;

    @Column(name = "replayed_status", nullable = false)
    private int replayedStatus;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "replayed_headers", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> replayedHeaders = new LinkedHashMap<>();

    @Column(name = "replayed_body", columnDefinition = "text")
    private String replayedBody;

    @Column(name = "replayed_response_time_ms", nullable = false)
    private long replayedResponseTimeMs;

    @Enumerated(EnumType.STRING)
    @Column(name = "drift_type", nullable = false, length = 24)
    private DriftType driftType = DriftType.NONE;

    @Column(name = "drift_summary", columnDefinition = "text")
    private String driftSummary;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "diff_json", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> diffJson = Map.of("drifts", java.util.List.of());

    @Enumerated(EnumType.STRING)
    @Column(name = "triage_status", nullable = false, length = 24)
    private TriageStatus triageStatus = TriageStatus.OPEN;

    @Column(name = "triage_note", columnDefinition = "text")
    private String triageNote;

    @Column(name = "triaged_at")
    private Instant triagedAt;

    @CreationTimestamp
    @Column(name = "replayed_at", nullable = false, updatable = false)
    private Instant replayedAt;

    protected ReplayResult() {
    }

    public ReplayResult(
            ReplaySession session,
            Baseline baseline,
            int replayedStatus,
            Map<String, Object> replayedHeaders,
            String replayedBody,
            long replayedResponseTimeMs,
            DriftType driftType,
            String driftSummary,
            Map<String, Object> diffJson
    ) {
        this.session = session;
        this.baseline = baseline;
        this.replayedStatus = replayedStatus;
        this.replayedHeaders = replayedHeaders == null ? new LinkedHashMap<>() : replayedHeaders;
        this.replayedBody = replayedBody;
        this.replayedResponseTimeMs = replayedResponseTimeMs;
        this.driftType = driftType;
        this.driftSummary = driftSummary;
        this.diffJson = diffJson == null ? Map.of("drifts", java.util.List.of()) : diffJson;
        this.triageStatus = driftType == DriftType.NONE ? TriageStatus.IGNORED : TriageStatus.OPEN;
    }

    public UUID getId() {
        return id;
    }

    public ReplaySession getSession() {
        return session;
    }

    public Baseline getBaseline() {
        return baseline;
    }

    public int getReplayedStatus() {
        return replayedStatus;
    }

    public Map<String, Object> getReplayedHeaders() {
        return replayedHeaders;
    }

    public String getReplayedBody() {
        return replayedBody;
    }

    public long getReplayedResponseTimeMs() {
        return replayedResponseTimeMs;
    }

    public DriftType getDriftType() {
        return driftType;
    }

    public String getDriftSummary() {
        return driftSummary;
    }

    public Map<String, Object> getDiffJson() {
        return diffJson;
    }

    public Instant getReplayedAt() {
        return replayedAt;
    }

    public TriageStatus getTriageStatus() {
        return triageStatus;
    }

    public String getTriageNote() {
        return triageNote;
    }

    public Instant getTriagedAt() {
        return triagedAt;
    }

    public void updateTriage(TriageStatus status, String note) {
        this.triageStatus = status;
        this.triageNote = note == null || note.isBlank() ? null : note.trim();
        this.triagedAt = Instant.now();
    }
}
