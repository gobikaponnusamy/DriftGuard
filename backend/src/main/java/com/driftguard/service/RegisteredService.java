package com.driftguard.service;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "services")
public class RegisteredService {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @Column(nullable = false, unique = true, length = 160)
    private String name;

    @Column(name = "base_url", nullable = false, columnDefinition = "text")
    private String baseUrl;

    @Column(name = "api_key", nullable = false)
    private String apiKeyHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "replay_auth_type", nullable = false, length = 32)
    private ReplayAuthType replayAuthType = ReplayAuthType.NONE;

    @Column(name = "replay_auth_header_name", length = 160)
    private String replayAuthHeaderName;

    @Column(name = "replay_auth_value", columnDefinition = "text")
    private String replayAuthValue;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected RegisteredService() {
    }

    public RegisteredService(String name, String baseUrl, String apiKeyHash) {
        this.name = name;
        this.baseUrl = baseUrl;
        this.apiKeyHash = apiKeyHash;
    }

    public RegisteredService(
            String name,
            String baseUrl,
            String apiKeyHash,
            ReplayAuthType replayAuthType,
            String replayAuthHeaderName,
            String replayAuthValue
    ) {
        this.name = name;
        this.baseUrl = baseUrl;
        this.apiKeyHash = apiKeyHash;
        this.replayAuthType = replayAuthType == null ? ReplayAuthType.NONE : replayAuthType;
        this.replayAuthHeaderName = replayAuthHeaderName;
        this.replayAuthValue = replayAuthValue;
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public String getApiKeyHash() {
        return apiKeyHash;
    }

    public ReplayAuthType getReplayAuthType() {
        return replayAuthType;
    }

    public String getReplayAuthHeaderName() {
        return replayAuthHeaderName;
    }

    public String getReplayAuthValue() {
        return replayAuthValue;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
