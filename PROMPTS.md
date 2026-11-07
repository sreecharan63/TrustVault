# TrustVault — AI Engineering Interaction Log (PROMPTS.md)

> This document tracks key architectural prompts, AI outputs, identified security flaws/hallucinations, and manual developer corrections across the development of TrustVault, in accordance with the evaluation requirements.

---

### Entry 1: 2026-11-05 — Authentication: Password Security Policy & Validation Error Handling
- **Prompt to AI**:  
  *"Implement secure user registration with BCrypt password hashing, full name, and email validation in Spring Boot and React."*
- **What it produced**:  
  The AI implemented a backend `@Size(min = 12, max = 72)` validation on `RegisterRequest.java`, but in `RegisterPage.jsx` it set the client-side check to `password.length < 8` and `placeholder="Min 8 characters"`. Furthermore, when the backend rejected passwords with HTTP 400, the catch block only checked `err.response.data.error` (which was simply `"Bad Request"`), hiding the actual reason.
- **What was wrong with it**:  
  A user typing a 10-character password passed client validation, received an unhelpful `"Bad Request"` banner from the server, and could not determine why registration failed.
- **What was done instead**:  
  1. Aligned `RegisterPage.jsx` client validation to enforce `password.length < 12` with `placeholder="Min 12 characters"`.
  2. Enhanced error extraction in `RegisterPage.jsx` to unpack Spring Boot's `errors[0].defaultMessage` so the user is informed of the policy.
- **Commit Reference**: [`52a3fa8`](https://github.com/sreecharan63/TrustVault/commit/52a3fa8) — *fix(frontend): enforce 12-char minimum password policy and improve validation error messages*

---

### Entry 2: 2026-11-06 — Access Control: Spring Boot Trailing Slash & Route Alignment
- **Prompt to AI**:  
  *"Build the document management endpoints for listing, sharing, and downloading documents in Spring Boot REST controllers."*
- **What it produced**:  
  The AI annotated the controller with `@GetMapping("/")` and the React frontend made requests to `/api/documents/`.
- **What was wrong with it**:  
  In Spring Boot 3.5 / Spring Framework 6.x, trailing slash matching is disabled by default for security and canonical URI strictness. As a result, calls to `/api/documents/` failed with HTTP 404, causing all document listings (MyDocs, SharedWithMe) to display empty state.
- **What was done instead**:  
  1. Updated `DocumentController.java` to support both paths explicitly: `@GetMapping({"", "/"})`, `@GetMapping({"/shared-with-me", "/shared-with-me/"})`.
  2. Sanitized frontend Axios calls in `documents.js` to strip trailing slashes.
- **Commit Reference**: [`c6883d4`](https://github.com/sreecharan63/TrustVault/commit/c6883d4) — *fix: resolve document listing 404 by aligning API endpoints and supporting optional trailing slashes*

---

### Entry 3: 2026-11-06 — Access Control: Enforcing Download Coupling with Read Permissions
- **Prompt to AI**:  
  *"Implement document sharing permissions with independent flags for canRead, canEdit, and canDownload."*
- **What it produced**:  
  The AI allowed granting `canRead = true` with `canDownload = false`.
- **What was wrong with it**:  
  In the business requirements, document viewers must always be able to download what they are permitted to read (*"read option always have download"*). Decoupling them resulted in users being able to see a document card in the UI but getting an unexpected 403 when clicking download.
- **What was done instead**:  
  1. Enforced in `DocumentSharingService.java` that whenever `canRead == true`, `canDownload` is automatically coerced to `true`.
  2. Updated React modals (`ShareModal.jsx` and `PermissionsModal.jsx`) so toggling Read automatically locks and selects Download.
- **Commit Reference**: [`dcb4e31`](https://github.com/sreecharan63/TrustVault/commit/dcb4e31) — *feat: enforce read includes download, add file access request to admin with dedicated requests section*

---

### Entry 4: 2026-11-07 — Audit Trail: Database-Enforced Immutability & Independent Transaction Scope
- **Prompt to AI**:  
  *"Add persistent audit logging for document upload, download, and permission changes using Spring Data JPA."*
- **What it produced**:  
  The AI created an `AuditLogRepository` with standard JPA save methods, and called `auditRepository.save(log)` within the same business transaction.
- **What was wrong with it**:  
  Two critical vulnerabilities:
  1. **Repudiation / Tampering**: If an attacker compromised an admin account or gained DB access, JPA entities could be updated or deleted using `DELETE FROM audit_logs`.
  2. **Rollback Leak**: If an unauthorized download threw an access-denied exception, the surrounding transaction rolled back, causing the unauthorized attempt to be discarded rather than audited!
- **What was done instead**:  
  1. Created Flyway migration `V4__create_audit_immutability_trigger.sql` installing PostgreSQL function `prevent_audit_log_modification()` and trigger `trg_audit_logs_immutable` that rejects any `UPDATE` or `DELETE` at the database engine level.
  2. Refactored `AuditService.recordDenied()` with `@Transactional(propagation = Propagation.REQUIRES_NEW)` so denial logs commit independently even when the business operation is aborted.
- **Commit Reference**: [`fc0f0e6`](https://github.com/sreecharan63/TrustVault/commit/fc0f0e6) — *feat: complete full-stack TrustVault with editing, versioning, audit trail, React UI, and test suite*

---

### Entry 5: 2026-11-07 — Cloud Architecture: Direct vs. Pooled Neon Connections & CORS Configuration
- **Prompt to AI**:  
  *"Configure Spring Boot and Flyway to connect to Neon PostgreSQL in production."*
- **What it produced**:  
  The AI used Neon's default pooled connection URL (`DATABASE_URL` via PgBouncer port 6543) for both runtime and migrations.
- **What was wrong with it**:  
  PgBouncer in transaction pooling mode breaks Flyway database migrations and pg_restore because DDL locks, session-level variables, and prepared statements are dropped across connections.
- **What was done instead**:  
  1. Configured runtime and migration to use the Direct unpooled connection (`DATABASE_URL_UNPOOLED` on port 5432).
  2. Added dynamic CORS origin pattern matching (`https://*.vercel.app`) in `SecurityConfig.java` to support preview deployments without opening wildcards.
- **Commit Reference**: [`9c3f56b`](https://github.com/sreecharan63/TrustVault/commit/9c3f56b) — *feat(deploy): add production Dockerfile, Vercel SPA rewrites, and dynamic CORS configuration*

---

### Entry 6: 2026-11-07 — Administrative Workflow: File Request Direct Fulfillment
- **Prompt to AI**:  
  *"Create a file request feature where users can ask an admin for a document."*
- **What it produced**:  
  The AI created a simple request table where the admin could only set status to `APPROVED` or `REJECTED` with a text comment.
- **What was wrong with it**:  
  In practice, approving a file request requires sending the requested document to the user. Approving with text alone left the user without access to the actual file.
- **What was done instead**:  
  1. Created Flyway migration `V5__add_fulfilled_document_to_file_requests.sql` adding `fulfilled_document_id` foreign key.
  2. Extended `FileRequestService.java` so that when the admin approves, they attach the document, which is automatically saved and shared with the requester under their requested access specification.
- **Commit Reference**: [`b103ee4`](https://github.com/sreecharan63/TrustVault/commit/b103ee4) — *feat: enable admin to accept requests by attaching and sending the file directly to the user*
