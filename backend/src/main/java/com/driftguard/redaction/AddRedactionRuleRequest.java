package com.driftguard.redaction;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AddRedactionRuleRequest(
        @NotBlank String fieldPath,
        @NotNull RedactionRuleType ruleType
) {
}
