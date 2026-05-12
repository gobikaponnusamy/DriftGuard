package com.driftguard.service;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterServiceRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank String baseUrl,
        ReplayAuthType replayAuthType,
        @Size(max = 160) String replayAuthHeaderName,
        String replayAuthValue
) {
}
