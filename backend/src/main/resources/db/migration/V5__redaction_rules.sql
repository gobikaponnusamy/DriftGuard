CREATE TABLE redaction_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    field_path TEXT NOT NULL,
    rule_type VARCHAR(24) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT redaction_rules_rule_type_check
        CHECK (rule_type IN ('REDACT', 'HASH', 'DROP')),
    CONSTRAINT redaction_rules_unique_rule UNIQUE (service_id, field_path, rule_type)
);

CREATE INDEX idx_redaction_rules_service ON redaction_rules(service_id);
