package com.driftguard.replay;

import com.driftguard.common.DriftType;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ReplayResultResponse(
        UUID id,
        UUID sessionId,
        UUID baselineId,
        String method,
        String path,
        int baselineStatus,
        long baselineResponseTimeMs,
        String baselineResponseBody,
        int replayedStatus,
        Map<String, Object> replayedHeaders,
        String replayedBody,
        long replayedResponseTimeMs,
        DriftType driftType,
        String driftSummary,
        Map<String, Object> diffJson,
        TriageStatus triageStatus,
        String triageNote,
        Instant triagedAt,
        Instant replayedAt
) {
    static ReplayResultResponse fromEntity(ReplayResult result) {
        return new ReplayResultResponse(
                result.getId(),
                result.getSession().getId(),
                result.getBaseline().getId(),
                result.getBaseline().getMethod(),
                result.getBaseline().getPath(),
                result.getBaseline().getResponseStatus(),
                result.getBaseline().getResponseTimeMs(),
                result.getBaseline().getResponseBody(),
                result.getReplayedStatus(),
                result.getReplayedHeaders(),
                result.getReplayedBody(),
                result.getReplayedResponseTimeMs(),
                result.getDriftType(),
                result.getDriftSummary(),
                result.getDiffJson(),
                result.getTriageStatus(),
                result.getTriageNote(),
                result.getTriagedAt(),
                result.getReplayedAt()
        );
    }
}
