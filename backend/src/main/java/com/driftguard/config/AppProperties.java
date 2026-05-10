package com.driftguard.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "driftguard")
public record AppProperties(String apiBaseUrl, String demoStagingUrl) {
}
