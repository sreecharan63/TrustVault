# TrustVault – Automated Testing Report

This document records the automated integration tests developed, verified, and executed against the TrustVault backend.

## 1. Test Suite Summary

- **Test Class:** `com.snovasys.trustvault.TrustvaultIntegrationTests`
- **Context Bootstrapper Test:** `com.snovasys.trustvault.TrustvaultApplicationTests`
- **Total Tests Run:** 7
- **Failures:** 0
- **Errors:** 0
- **Skipped:** 0
- **Build Status:** SUCCESS

---

## 2. Integration Test Scenarios (`TrustvaultIntegrationTests.java`)

### Test 1: User Registration, Login & Profile Retrieval
- **Method:** `testUserRegistrationAndLogin()`
- **Assertions:**
  - `POST /api/auth/register` creates user and returns JWT bearer token.
  - `POST /api/auth/login` verifies BCrypt password and issues token.
  - `GET /api/auth/me` with Bearer token verifies user ID, email, full name, and role.
  - Unauthenticated access returns `401 Unauthorized`.

### Test 2: Document Upload, Download & Cross-User Security Denial
- **Method:** `testDocumentUploadDownloadAndCrossUserDenial()`
- **Assertions:**
  - User A uploads a document via `multipart/form-data` with metadata (category, tags).
  - Checksum (SHA-256) and file size are validated and stored.
  - User A downloads document successfully (status 200).
  - User B attempts to download User A's unshared document: rejected with `403 Forbidden`.
  - Audit trail records `DOCUMENT_DOWNLOAD` with outcome `DENIED` in `audit_logs`.

### Test 3: Document Sharing, Edit Permissions & Revocation Lifecycle
- **Method:** `testSharingEditAndRevocation()`
- **Assertions:**
  - User A shares document with User B granting `canRead=true`, `canEdit=true`, `canDownload=false`.
  - User B can edit metadata or file content.
  - User B attempts download without download permission: rejected with `403 Forbidden`.
  - User A revokes sharing via `DELETE /api/documents/{id}/share?recipientEmail=...`.
  - User B immediately loses read, edit, and download access (status 403 / 404).

### Test 4: Document Versioning & Version Restore
- **Method:** `testDocumentVersioningAndRestore()`
- **Assertions:**
  - Initial upload starts at version 1.
  - Editing document with a replacement file creates a version snapshot (version 1 archived in `document_versions`).
  - Document version increments to version 2.
  - `POST /api/documents/{id}/versions/1/restore` restores the original file content.
  - Restoring duplicates storage file to prevent unique constraint collisions and creates version 3 with the restored content.

### Test 5: Soft Delete Lifecycle
- **Method:** `testDocumentSoftDelete()`
- **Assertions:**
  - Document owner deletes document via `DELETE /api/documents/{id}`.
  - Document status transitions to `DELETED` and `deleted_at` timestamp is set.
  - Document is immediately excluded from `GET /api/documents` and subsequent download attempts fail.

### Test 6: Administrator Audit Log Security & Access Control
- **Method:** `testAdminAuditLogSecurity()`
- **Assertions:**
  - Regular `USER` attempting `GET /api/admin/audit-logs` receives `403 Forbidden`.
  - Unauthenticated request receives `401 Unauthorized`.
  - User with `ADMIN` role receives `200 OK` with paginated audit logs.
  - Database-level trigger prevents any UPDATE or DELETE operations on `audit_logs` table (immutability guarantee).
