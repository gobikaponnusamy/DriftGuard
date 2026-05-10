package com.driftguard.recorder;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record BaselineResponse(
        UUID id,
        UUID serviceId,
        String method,
        String path,
        Map<String, Object> requestHeaders,
        String requestBody,
        int responseStatus,
        Map<String, Object> responseHeaders,
        String responseBody,
        long responseTimeMs,
        Instant capturedAt
) {
    static BaselineResponse fromEntity(Baseline baseline) {
        return new BaselineResponse(
                baseline.getId(),
                baseline.getService().getId(),
                baseline.getMethod(),
                baseline.getPath(),
                baseline.getRequestHeaders(),
                baseline.getRequestBody(),
                baseline.getResponseStatus(),
                baseline.getResponseHeaders(),
                baseline.getResponseBody(),
                baseline.getResponseTimeMs(),
                baseline.getCapturedAt()
        );
    }
}
