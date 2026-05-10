package com.driftguard.auth;

import java.time.Instant;
import java.util.UUID;

public record LoginResponse(
        UUID userId,
        String email,
        String displayName,
        String role,
        String accessToken,
        String tokenType,
        Instant expiresAt
) {
}
