package com.driftguard.recorder;

import com.driftguard.service.RegisteredService;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "baselines")
public class Baseline {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private RegisteredService service;

    @Column(nullable = false, length = 16)
    private String method;

    @Column(nullable = false, columnDefinition = "text")
    private String path;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "request_headers", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> requestHeaders = new LinkedHashMap<>();

    @Column(name = "request_body", columnDefinition = "text")
    private String requestBody;

    @Column(name = "response_status", nullable = false)
    private int responseStatus;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_headers", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> responseHeaders = new LinkedHashMap<>();

    @Column(name = "response_body", columnDefinition = "text")
    private String responseBody;

    @Column(name = "response_time_ms", nullable = false)
    private long responseTimeMs;

    @CreationTimestamp
    @Column(name = "captured_at", nullable = false, updatable = false)
    private Instant capturedAt;

    protected Baseline() {
    }

    public Baseline(
            RegisteredService service,
            String method,
            String path,
            Map<String, Object> requestHeaders,
            String requestBody,
            int responseStatus,
            Map<String, Object> responseHeaders,
            String responseBody,
            long responseTimeMs
    ) {
        this.service = service;
        this.method = method;
        this.path = path;
        this.requestHeaders = requestHeaders == null ? new LinkedHashMap<>() : requestHeaders;
        this.requestBody = requestBody;
        this.responseStatus = responseStatus;
        this.responseHeaders = responseHeaders == null ? new LinkedHashMap<>() : responseHeaders;
        this.responseBody = responseBody;
        this.responseTimeMs = responseTimeMs;
    }

    public UUID getId() {
        return id;
    }

    public RegisteredService getService() {
        return service;
    }

    public String getMethod() {
        return method;
    }

    public String getPath() {
        return path;
    }

    public Map<String, Object> getRequestHeaders() {
        return requestHeaders;
    }

    public String getRequestBody() {
        return requestBody;
    }

    public int getResponseStatus() {
        return responseStatus;
    }

    public Map<String, Object> getResponseHeaders() {
        return responseHeaders;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public long getResponseTimeMs() {
        return responseTimeMs;
    }

    public Instant getCapturedAt() {
        return capturedAt;
    }

    public void updateFrom(
            String method,
            String path,
            Map<String, Object> requestHeaders,
            String requestBody,
            int responseStatus,
            Map<String, Object> responseHeaders,
            String responseBody,
            long responseTimeMs
    ) {
        this.method = method;
        this.path = path;
        this.requestHeaders = requestHeaders == null ? new LinkedHashMap<>() : requestHeaders;
        this.requestBody = requestBody;
        this.responseStatus = responseStatus;
        this.responseHeaders = responseHeaders == null ? new LinkedHashMap<>() : responseHeaders;
        this.responseBody = responseBody;
        this.responseTimeMs = responseTimeMs;
    }
}
