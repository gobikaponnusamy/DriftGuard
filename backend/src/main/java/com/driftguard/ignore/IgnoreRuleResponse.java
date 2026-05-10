package com.driftguard.ignore;

import java.time.Instant;
import java.util.UUID;

public record IgnoreRuleResponse(
        UUID id,
        UUID serviceId,
        String fieldPath,
        IgnoreRuleType ruleType,
        Instant createdAt
) {
    static IgnoreRuleResponse fromEntity(IgnoreRule rule) {
        return new IgnoreRuleResponse(
                rule.getId(),
                rule.getService().getId(),
                rule.getFieldPath(),
                rule.getRuleType(),
                rule.getCreatedAt()
        );
    }
}
