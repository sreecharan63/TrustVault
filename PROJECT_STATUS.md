# TrustVault – Project Status

## 1. Project Information

- **Project:** TrustVault – Secure Document Sharing with a Real Audit Trail
- **Challenge:** Snovasys Fresher Hiring Challenge
- **Current Status:** Feature-Complete, Tested & Running
- **Frontend URL:** `http://localhost:5173`
- **Backend URL:** `http://localhost:8080`

---

## 2. Technology Stack & Verification

| Component | Technology | Version | Status |
|---|---|---|---|
| Backend | Java, Spring Boot | Java 21, Spring Boot 4.0.0 | Verified & Running (port 8080) |
| Security | Spring Security, JJWT, BCrypt | JJWT 0.12.6, BCrypt (strength 12) | Enforced & Tested |
| Frontend | React, Vite, React Router, Axios | React 18.3, Vite 6.0 | Verified & Running (port 5173) |
| Database | PostgreSQL | PostgreSQL 17.11 (port 5432) | Active |
| Migrations | Flyway | Flyway 11.13.0 | Schema Version 3 Applied |
| Testing | JUnit 5, Spring Security Test | 7 / 7 Tests Passing | BUILD SUCCESS |
| Version Control | Git | Local `main` branch | Tracked |

---

## 3. Completed Architecture & Features

### A. Authentication & User Management
- [x] BCrypt (strength 12) password hashing.
- [x] Stateless JWT authentication with standard response format (`accessToken`, `tokenType`, `expiresIn`).
- [x] Global role-based access control (`USER` and `ADMIN`).
- [x] Current user profile endpoint (`GET /api/auth/me`).
- [x] Client session management with automatic token attachment and 401 handling.

### B. Document Management & File Storage
- [x] Local storage outside web root (`D:\TrustVault\storage`).
- [x] SHA-256 integrity checksum calculation upon upload and edit.
- [x] MIME/type detection and file size validation.
- [x] Metadata support: categorization and tag filtering.
- [x] Full search over filename, description, category, and tags.
- [x] Safe soft delete (`DELETED` status, timestamped, hidden from document listings).
- [x] Preview (inline stream) and Download (attachment stream) endpoints.

### C. Granular Sharing & Permissions
- [x] Independent flags: `canRead`, `canEdit`, `canDownload`.
- [x] Immediate revocation (`DELETE /api/documents/{id}/share?recipientEmail=...`).
- [x] Permission modification (`PUT /api/documents/{id}/share`).
- [x] Prevention of duplicate active permissions and sharing with self.
- [x] Verification of active recipient account status.
- [x] Shared-by-me and shared-with-me views.

### D. Document Versioning
- [x] Automated historical snapshots on file modification (`document_versions` table).
- [x] Monotonically increasing version counter (`current_version_number`).
- [x] Version listing and specific historical version download.
- [x] Historical version restore with collision-safe storage file duplication.

### E. Immutability & Audit Trail
- [x] Tamper-resistant PostgreSQL audit log schema.
- [x] Database-level trigger (`prevent_audit_log_modification`) prohibiting `UPDATE` and `DELETE`.
- [x] Transactional propagation guarantees:
  - Successful operations: `Propagation.MANDATORY`.
  - Denied / unauthorized operations: `Propagation.REQUIRES_NEW`.
- [x] Non-repudiation: captures actor email, client IP, user agent, event type, and outcome.
- [x] Administrator audit query API with multi-field filtering (actor, event type, outcome, resource, dates) and pagination.
- [x] Per-document activity trail accessible to owners and authorized collaborators.

### F. Modern React Frontend
- [x] Built with React 18, Vite, React Router v6, Axios, and clean CSS styling.
- [x] Login and Registration screens with validation.
- [x] Dashboard with quick stats (documents, categories, shares) and recent activity.
- [x] "My Documents" with live search, category filtering, upload modal, inline actions (edit, share, manage permissions, view versions, view audit log, delete).
- [x] "Shared With Me" enforcing granular permission-based actions.
- [x] "Shared By Me" with live collaborator management and permission toggles.
- [x] Administrator Audit Trail page with filters and pagination.
- [x] User Profile page with role badge and secure sign out.

---

## 4. Test Verification Summary

- Context load test: **Passed**
- Integration test suite (6 end-to-end tests): **Passed**
- Overall test execution: **7 tests, 0 failures, 0 errors, 0 skipped**
