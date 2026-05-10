package com.driftguard.demo;

import java.util.UUID;

public record DemoRunResponse(
        UUID serviceId,
        int capturedCount,
        UUID sessionId,
        String stagingUrl
) {
}
