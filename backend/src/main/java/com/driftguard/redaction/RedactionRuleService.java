package com.driftguard.redaction;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface RedactionRuleService {

    RedactionRuleResponse add(UUID serviceId, AddRedactionRuleRequest request);

    List<RedactionRuleResponse> list(UUID serviceId);

    void delete(UUID serviceId, UUID ruleId);

    RedactedHttpExchange redactExchange(
            UUID serviceId,
            Map<String, Object> requestHeaders,
            String requestBody,
            Map<String, Object> responseHeaders,
            String responseBody
    );
}
