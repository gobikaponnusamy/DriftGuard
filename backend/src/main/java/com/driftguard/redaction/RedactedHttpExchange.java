package com.driftguard.redaction;

import java.util.Map;

public record RedactedHttpExchange(
        Map<String, Object> requestHeaders,
        String requestBody,
        Map<String, Object> responseHeaders,
        String responseBody
) {
}
