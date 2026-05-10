package com.driftguard.service;

import java.time.Instant;
import java.util.UUID;

public record RegisteredServiceResponse(
        UUID id,
        String name,
        String baseUrl,
        Instant createdAt
) {
    static RegisteredServiceResponse fromEntity(RegisteredService service) {
        return new RegisteredServiceResponse(
                service.getId(),
                service.getName(),
                service.getBaseUrl(),
                service.getCreatedAt()
        );
    }
}
