package com.driftguard.replay;

import java.time.Instant;
import java.util.UUID;

public record ReplaySessionResponse(
        UUID id,
        UUID serviceId,
        String stagingUrl,
        ReplayStatus status,
        Instant triggeredAt,
        Instant completedAt,
        int totalRequests,
        int driftedCount
) {
    static ReplaySessionResponse fromEntity(ReplaySession session) {
        return new ReplaySessionResponse(
                session.getId(),
                session.getService().getId(),
                session.getStagingUrl(),
                session.getStatus(),
                session.getTriggeredAt(),
                session.getCompletedAt(),
                session.getTotalRequests(),
                session.getDriftedCount()
        );
    }
}
