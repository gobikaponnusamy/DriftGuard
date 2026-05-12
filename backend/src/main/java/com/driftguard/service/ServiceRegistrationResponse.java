package com.driftguard.service;

import java.time.Instant;
import java.util.UUID;

public record ServiceRegistrationResponse(
        UUID id,
        String name,
        String baseUrl,
        String apiKey,
        ReplayAuthType replayAuthType,
        String replayAuthHeaderName,
        boolean replayAuthConfigured,
        Instant createdAt
) {
    static ServiceRegistrationResponse fromEntity(RegisteredService service, String apiKey) {
        return new ServiceRegistrationResponse(
                service.getId(),
                service.getName(),
                service.getBaseUrl(),
                apiKey,
                service.getReplayAuthType(),
                service.getReplayAuthHeaderName(),
                service.getReplayAuthType() != ReplayAuthType.NONE && service.getReplayAuthValue() != null
                        && !service.getReplayAuthValue().isBlank(),
                service.getCreatedAt()
        );
    }
}
