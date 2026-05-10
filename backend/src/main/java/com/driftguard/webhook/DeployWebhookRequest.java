package com.driftguard.webhook;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record DeployWebhookRequest(
        @NotNull UUID serviceId,
        @NotBlank String stagingUrl,
        Boolean failOnBreaking,
        Boolean failOnAnyDrift,
        Integer maxWaitSeconds
) {
    public boolean shouldFailOnBreaking() {
        return failOnBreaking == null || failOnBreaking;
    }

    public boolean shouldFailOnAnyDrift() {
        return failOnAnyDrift != null && failOnAnyDrift;
    }

    public int waitSeconds() {
        if (maxWaitSeconds == null) {
            return 60;
        }
        return Math.max(1, Math.min(maxWaitSeconds, 300));
    }
}
