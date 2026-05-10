package com.driftguard.ignore;

import com.driftguard.service.RegisteredService;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

@Entity
@Table(name = "ignore_rules")
public class IgnoreRule {

    @Id
    @GeneratedValue
    @UuidGenerator
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_id", nullable = false)
    private RegisteredService service;

    @Column(name = "field_path", nullable = false, columnDefinition = "text")
    private String fieldPath;

    @Enumerated(EnumType.STRING)
    @Column(name = "rule_type", nullable = false, length = 24)
    private IgnoreRuleType ruleType;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected IgnoreRule() {
    }

    public IgnoreRule(RegisteredService service, String fieldPath, IgnoreRuleType ruleType) {
        this.service = service;
        this.fieldPath = fieldPath;
        this.ruleType = ruleType;
    }

    public UUID getId() {
        return id;
    }

    public RegisteredService getService() {
        return service;
    }

    public String getFieldPath() {
        return fieldPath;
    }

    public IgnoreRuleType getRuleType() {
        return ruleType;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
