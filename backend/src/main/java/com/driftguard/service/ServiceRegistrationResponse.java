package com.driftguard.service;

import java.time.Instant;
import java.util.UUID;

public record ServiceRegistrationResponse(
        UUID id,
        String name,
        String baseUrl,
        String apiKey,
        Instant createdAt
) {
    static ServiceRegistrationResponse fromEntity(RegisteredService service, String apiKey) {
        return new ServiceRegistrationResponse(
                service.getId(),
                service.getName(),
                service.getBaseUrl(),
                apiKey,
                service.getCreatedAt()
        );
    }
}
