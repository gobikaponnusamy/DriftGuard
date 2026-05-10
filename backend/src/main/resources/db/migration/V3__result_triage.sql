ALTER TABLE replay_results
    ADD COLUMN triage_status VARCHAR(24) NOT NULL DEFAULT 'OPEN',
    ADD COLUMN triage_note TEXT,
    ADD COLUMN triaged_at TIMESTAMPTZ;

ALTER TABLE replay_results
    ADD CONSTRAINT replay_results_triage_status_check
        CHECK (triage_status IN ('OPEN', 'ACCEPTED', 'IGNORED', 'FIXED', 'BLOCKING'));

UPDATE replay_results
SET triage_status = 'IGNORED'
WHERE drift_type = 'NONE';
