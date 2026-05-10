package com.driftguard.replay;

import java.util.Map;

record ReplayedHttpResponse(
        int status,
        Map<String, Object> headers,
        String body,
        long responseTimeMs
) {
}
