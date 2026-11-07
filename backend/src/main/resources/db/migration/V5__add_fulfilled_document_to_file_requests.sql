-- ============================================================
-- TrustVault V5: Link fulfilled document to file_requests
-- ============================================================

ALTER TABLE file_requests
ADD COLUMN fulfilled_document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

CREATE INDEX idx_file_requests_fulfilled_doc ON file_requests(fulfilled_document_id);
