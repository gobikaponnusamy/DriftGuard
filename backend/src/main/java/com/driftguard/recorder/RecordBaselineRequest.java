package com.driftguard.recorder;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record RecordBaselineRequest(
        @NotBlank String method,
        @NotBlank String path,
        Map<String, Object> requestHeaders,
        String requestBody,
        @NotNull @Min(100) Integer responseStatus,
        Map<String, Object> responseHeaders,
        String responseBody,
        @NotNull @Min(0) Long responseTimeMs
) {
}
