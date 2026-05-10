package com.driftguard.webhook;

import com.driftguard.replay.ReplayStatus;
import java.util.UUID;

public record DeployGateResponse(
        UUID sessionId,
        ReplayStatus status,
        int totalRequests,
        int driftedCount,
        long breakingCount,
        long warningCount,
        long performanceCount,
        String decision,
        String message
) {
}
