package com.driftguard.replay;

import jakarta.validation.constraints.NotNull;

public record UpdateTriageRequest(
        @NotNull TriageStatus status,
        String note
) {
}
