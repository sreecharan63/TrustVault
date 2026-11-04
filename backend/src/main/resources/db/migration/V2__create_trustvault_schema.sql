
-- ============================================================
-- TrustVault V2: Core database schema
-- PostgreSQL 17
-- ============================================================

-- 1. APPLICATION USERS
CREATE TABLE app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER'
        CHECK (role IN ('ADMIN', 'USER')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. DOCUMENTS
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES app_users(id),
    original_filename VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(150) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    checksum_sha256 VARCHAR(64) NOT NULL,
    current_version_number INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'DELETED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

-- 3. DOCUMENT VERSIONS
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL CHECK (version_number > 0),
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(150) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    storage_key VARCHAR(500) NOT NULL UNIQUE,
    checksum_sha256 VARCHAR(64) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (document_id, version_number)
);

-- 4. DOCUMENT PERMISSIONS
CREATE TABLE document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    grantee_user_id UUID NOT NULL REFERENCES app_users(id),
    can_read BOOLEAN NOT NULL DEFAULT TRUE,
    can_download BOOLEAN NOT NULL DEFAULT FALSE,
    granted_by UUID NOT NULL REFERENCES app_users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    CHECK (can_download = FALSE OR can_read = TRUE)
);

-- One active permission per document/user pair.
CREATE UNIQUE INDEX uq_active_document_permission
ON document_permissions(document_id, grantee_user_id)
WHERE revoked_at IS NULL;

-- 5. AUDIT LOGS
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(30) NOT NULL
        CHECK (resource_type IN ('DOCUMENT', 'USER', 'PERMISSION')),
    resource_id UUID,
    outcome VARCHAR(20) NOT NULL
        CHECK (outcome IN ('SUCCESS', 'DENIED', 'FAILURE')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. INDEXES
CREATE INDEX idx_documents_owner
    ON documents(owner_id);

CREATE INDEX idx_documents_status
    ON documents(status);

CREATE INDEX idx_document_versions_document
    ON document_versions(document_id);

CREATE INDEX idx_permissions_grantee
    ON document_permissions(grantee_user_id);

CREATE INDEX idx_audit_actor
    ON audit_logs(actor_user_id);

CREATE INDEX idx_audit_resource
    ON audit_logs(resource_type, resource_id);

CREATE INDEX idx_audit_created_at
    ON audit_logs(created_at DESC);

-- 7. AUDIT LOG IMMUTABILITY
CREATE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are append-only and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_audit_log_modification();
