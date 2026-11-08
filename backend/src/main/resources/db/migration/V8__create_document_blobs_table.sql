CREATE TABLE IF NOT EXISTS document_blobs (
    storage_key VARCHAR(500) PRIMARY KEY,
    data BYTEA NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_document_blobs_created_at ON document_blobs (created_at);
