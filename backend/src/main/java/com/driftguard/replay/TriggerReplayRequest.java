package com.driftguard.replay;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record TriggerReplayRequest(
        @NotNull UUID serviceId,
        @NotBlank String stagingUrl
) {
}
