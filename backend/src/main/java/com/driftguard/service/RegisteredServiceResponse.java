package com.driftguard.service;

import java.time.Instant;
import java.util.UUID;

public record RegisteredServiceResponse(
        UUID id,
        String name,
        String baseUrl,
        ReplayAuthType replayAuthType,
        String replayAuthHeaderName,
        boolean replayAuthConfigured,
        Instant createdAt
) {
    static RegisteredServiceResponse fromEntity(RegisteredService service) {
        return new RegisteredServiceResponse(
                service.getId(),
                service.getName(),
                service.getBaseUrl(),
                service.getReplayAuthType(),
                service.getReplayAuthHeaderName(),
                service.getReplayAuthType() != ReplayAuthType.NONE && service.getReplayAuthValue() != null
                        && !service.getReplayAuthValue().isBlank(),
                service.getCreatedAt()
        );
    }
}
