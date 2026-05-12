package com.driftguard.replay;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record TriggerBaselineReplayRequest(
        @NotNull UUID serviceId,
        @NotNull UUID baselineId,
        @NotBlank String stagingUrl
) {
}
