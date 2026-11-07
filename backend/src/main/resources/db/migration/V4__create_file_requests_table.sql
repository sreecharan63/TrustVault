-- ============================================================
-- TrustVault V4: File requests to Admin
-- ============================================================

CREATE TABLE file_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    access_specification VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_response TEXT,
    resolved_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_file_requests_requester ON file_requests(requester_id);
CREATE INDEX idx_file_requests_status ON file_requests(status);
