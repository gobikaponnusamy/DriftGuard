package com.driftguard.webhook;

import java.util.UUID;

public record DeployWebhookResponse(
        UUID sessionId,
        String gateUrl,
        String decision,
        String message
) {
}
