CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL UNIQUE,
    base_url TEXT NOT NULL,
    api_key VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    method VARCHAR(16) NOT NULL,
    path TEXT NOT NULL,
    request_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    request_body TEXT,
    response_status INTEGER NOT NULL,
    response_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_body TEXT,
    response_time_ms BIGINT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE replay_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    staging_url TEXT NOT NULL,
    status VARCHAR(24) NOT NULL,
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    total_requests INTEGER NOT NULL DEFAULT 0,
    drifted_count INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT replay_sessions_status_check
        CHECK (status IN ('PENDING', 'RUNNING', 'DONE', 'FAILED'))
);

CREATE TABLE replay_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES replay_sessions(id) ON DELETE CASCADE,
    baseline_id UUID NOT NULL REFERENCES baselines(id) ON DELETE CASCADE,
    replayed_status INTEGER NOT NULL,
    replayed_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
    replayed_body TEXT,
    replayed_response_time_ms BIGINT NOT NULL,
    drift_type VARCHAR(24) NOT NULL,
    drift_summary TEXT,
    diff_json JSONB NOT NULL DEFAULT '{"drifts":[]}'::jsonb,
    replayed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT replay_results_drift_type_check
        CHECK (drift_type IN ('NONE', 'BREAKING', 'WARNING', 'PERFORMANCE'))
);

CREATE TABLE ignore_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    field_path TEXT NOT NULL,
    rule_type VARCHAR(24) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ignore_rules_rule_type_check
        CHECK (rule_type IN ('IGNORE', 'MASK')),
    CONSTRAINT ignore_rules_unique_rule UNIQUE (service_id, field_path, rule_type)
);

CREATE INDEX idx_baselines_service_captured_at ON baselines(service_id, captured_at DESC);
CREATE INDEX idx_replay_sessions_service_triggered_at ON replay_sessions(service_id, triggered_at DESC);
CREATE INDEX idx_replay_results_session ON replay_results(session_id);
CREATE INDEX idx_ignore_rules_service ON ignore_rules(service_id);
