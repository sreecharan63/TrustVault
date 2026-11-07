-- ============================================================
-- TrustVault V3: Schema extension for editing, versioning,
-- metadata, and categories
-- PostgreSQL 17
-- ============================================================

-- 1. Add can_edit to document_permissions
ALTER TABLE document_permissions
    ADD COLUMN IF NOT EXISTS can_edit BOOLEAN NOT NULL DEFAULT FALSE;

-- Ensure edit permission requires read permission
ALTER TABLE document_permissions
    ADD CONSTRAINT chk_can_edit_requires_read
    CHECK (can_edit = FALSE OR can_read = TRUE);

-- 2. Add category and tags to documents
ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS category VARCHAR(100);

ALTER TABLE documents
    ADD COLUMN IF NOT EXISTS tags VARCHAR(255);

-- 3. Indexes for search and category filtering
CREATE INDEX IF NOT EXISTS idx_documents_category
    ON documents(category);

CREATE INDEX IF NOT EXISTS idx_documents_updated_at
    ON documents(updated_at DESC);
