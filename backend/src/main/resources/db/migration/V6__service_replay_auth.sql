ALTER TABLE services
    ADD COLUMN replay_auth_type VARCHAR(32) NOT NULL DEFAULT 'NONE',
    ADD COLUMN replay_auth_header_name VARCHAR(160),
    ADD COLUMN replay_auth_value TEXT;

ALTER TABLE services
    ADD CONSTRAINT services_replay_auth_type_check
        CHECK (replay_auth_type IN ('NONE', 'BEARER_TOKEN', 'API_KEY_HEADER', 'BASIC_AUTH', 'CUSTOM_HEADER'));
