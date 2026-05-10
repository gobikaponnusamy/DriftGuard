package com.driftguard.report;

import java.util.UUID;

public record TimelinePointResponse(
        UUID sessionId,
        String date,
        long breaking,
        long warning,
        long performance
) {
}
