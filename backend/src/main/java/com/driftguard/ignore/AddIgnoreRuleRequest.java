package com.driftguard.ignore;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AddIgnoreRuleRequest(
        @NotBlank String fieldPath,
        @NotNull IgnoreRuleType ruleType
) {
}
