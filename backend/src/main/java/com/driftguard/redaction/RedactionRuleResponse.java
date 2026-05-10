package com.driftguard.redaction;

import java.time.Instant;
import java.util.UUID;

public record RedactionRuleResponse(
        UUID id,
        UUID serviceId,
        String fieldPath,
        RedactionRuleType ruleType,
        Instant createdAt
) {
    static RedactionRuleResponse fromEntity(RedactionRule rule) {
        return new RedactionRuleResponse(
                rule.getId(),
                rule.getService().getId(),
                rule.getFieldPath(),
                rule.getRuleType(),
                rule.getCreatedAt()
        );
    }
}
