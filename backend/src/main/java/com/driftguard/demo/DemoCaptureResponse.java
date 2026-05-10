package com.driftguard.demo;

import java.util.UUID;

public record DemoCaptureResponse(
        UUID serviceId,
        int capturedCount,
        String productionBaseUrl
) {
}
