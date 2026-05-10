package com.driftguard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "driftguard.cors")
public record CorsProperties(String allowedOrigins) {
}
