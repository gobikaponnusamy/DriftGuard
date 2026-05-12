package com.driftguard.report;

import com.driftguard.common.DriftType;
import java.time.Instant;
import java.util.UUID;

public record EndpointHistoryResponse(
        UUID sessionId,
        Instant replayedAt,
        DriftType driftType,
        String triageStatus,
        long responseTimeMs
) {
}
