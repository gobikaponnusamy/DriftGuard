package com.driftguard.report;

import com.driftguard.replay.ReplayStatus;
import java.time.Instant;
import java.util.UUID;

public record ReleaseReadinessResponse(
        UUID serviceId,
        UUID sessionId,
        ReplayStatus status,
        String decision,
        String message,
        Instant triggeredAt,
        int totalRequests,
        int driftedCount,
        long breakingCount,
        long warningCount,
        long performanceCount,
        long openCount,
        long acceptedCount,
        long ignoredCount,
        long fixedCount,
        long blockingCount
) {
}
