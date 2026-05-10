CREATE TABLE baseline_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES replay_sessions(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    promoted_by VARCHAR(255) NOT NULL,
    note TEXT,
    promoted_count INTEGER NOT NULL,
    forced BOOLEAN NOT NULL DEFAULT false,
    promoted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_baseline_promotions_service_promoted_at
    ON baseline_promotions(service_id, promoted_at DESC);

CREATE INDEX idx_baseline_promotions_session
    ON baseline_promotions(session_id);
