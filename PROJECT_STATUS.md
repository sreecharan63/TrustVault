# TrustVault – Project Status & Delivery Report

> **Last Updated:** 2026-11-08  
> **Status:** Feature-Complete, Hardened, Live Deployed & Tested (100% Passing)

---

## 1. Live Deployment Infrastructure

| Component | Platform | Environment / Access Point | Status |
|---|---|---|---|
| **Frontend UI** | **Vercel** (Global Edge CDN) | **[https://trust-vault-mu.vercel.app](https://trust-vault-mu.vercel.app)** | **Live & Operational** |
| **Backend REST API** | **Render** (Java 21 / Spring Boot 4) | **[https://trustvault-16f1.onrender.com](https://trustvault-16f1.onrender.com)** | **Live & Operational** |
| **Managed Database** | **Neon** (PostgreSQL 17.11) | Direct unpooled connection (Port 5432) | **Active (Schema V7)** |
| **Source Repository** | **GitHub** | **[https://github.com/sreecharan63/TrustVault](https://github.com/sreecharan63/TrustVault)** | **Main Branch Synced** |

---

## 2. Technology Stack & Verification Matrix

| Layer | Technology | Version | Operational Status |
|---|---|---|---|
| **Backend Runtime** | Java JDK | OpenJDK 21 | Verified on Windows & Linux (Docker) |
| **Framework** | Spring Boot | 4.0.0 (WebMVC, Data JPA, Security) | Verified & Tested |
| **Security / Auth** | Spring Security, JJWT, BCrypt | JJWT 0.12.6, BCrypt (strength 12) | Strict Stateless Bearer Tokens |
| **Database Engine** | PostgreSQL | PostgreSQL 17.11 | ACID Compliant, Kernel Triggers |
| **Schema Migration** | Flyway | Flyway 11.14.1 | V1 through V7 with Auto-Repair Strategy |
| **Frontend Framework** | React + Vite | React 18.3, Vite 6.0 | Production Bundled & Optimized |
| **Design System** | Custom Netflix Cinematic Theme | `#141414`, `#181818`, `#E50914` | High Contrast, Custom Favicon & SVG Emblem |
| **Test Engine** | JUnit 5, Spring Security Test | 14 Test Scenarios | **100% Passing (0 Failures, 0 Errors)** |

---

## 3. Completed Architecture & Delivered Features

### A. Authentication & Self-Service Security
- [x] **BCrypt Password Hashing**: Enforces 12-character minimum password policy with strength 12.
- [x] **Stateless JWT**: Standard token assertion with `sub: email`, expiration, and automatic client-side Axios bearer interceptor.
- [x] **Self-Service Password Reset**:
  - Request reset token (`POST /api/auth/forgot-password`) with 15-minute time window.
  - Cryptographically secure 32-byte tokens hashed via SHA-256 before database storage.
  - Reset password execution (`POST /api/auth/reset-password`) with instant single-use invalidation.
- [x] **Password Visibility Controls**: Interactive `Eye` / `EyeOff` toggles across Login, Register, and Forgot Password inputs.
- [x] **Browser Autofill Theme Override**: Explicit `-webkit-autofill` box-shadow overrides preventing browser password managers from turning inputs white.

### B. Three-Tier Role-Based Authorization
- [x] **Administrator (`ADMIN`)**: Full supervisory authority over all platform documents, global immutable audit logs, file requests, and direct permission management.
- [x] **Document Owner (`DOCUMENT_OWNER`)**: Authority to upload, version, grant/revoke permissions, and soft-delete owned documents.
- [x] **Viewer (`VIEWER`)**: Restricted consumer allowed to view and download shared documents; **strictly blocked from uploading documents** (server returns HTTP 403).

### C. Document Management & Versioning
- [x] **Storage Isolation**: Files stored outside web root (`D:\TrustVault\storage`) using randomized cryptographic storage keys (`UUID + cleanName`).
- [x] **Cryptographic Integrity**: SHA-256 checksum calculated on byte streams during upload and modification.
- [x] **Metadata & Search**: Real-time search across filename, description, category, and tags.
- [x] **Safe Soft-Deletion**: Timestamped `DELETED` status, preventing data loss while excluding deleted records from active listings.
- [x] **Historical Snapshot Versioning**: Automatic version snapshots on modification (`document_versions`), monotonically increasing version counters, version downloads, and safe version restoration.

### D. Sharing & Granular Access Control
- [x] **Immediate Revocation**: Permissions queried live on PostgreSQL on every request; zero caching lag.
- [x] **Read-Includes-Download Guarantee**: Enforces business rule that read access inherently provides download capability.
- [x] **Collaborator Suggestion**: Dropdown list of existing users with self-share prevention.
- [x] **Chained Upload & Share**: Dedicated `📤 Upload & Share` option in "Shared By Me" automatically opening the sharing modal upon file upload.

### E. File Access Request Lifecycle
- [x] **Request Submission**: Users can submit formal requests to administrators for specific files with descriptions and required access levels.
- [x] **Administrator Request Queue**: Status filtering (`PENDING`, `APPROVED`, `REJECTED`) with count badges.
- [x] **Direct Document Fulfillment**: Administrators fulfill requests by attaching the file directly; the system automatically stores the document and creates the requested permission for the requester.

### F. Global Audit Trail & Compliance
- [x] **Database-Enforced Immutability**: PostgreSQL trigger `trg_audit_logs_immutable` raises an exception on any `UPDATE` or `DELETE` attempt against `audit_logs`.
- [x] **Independent Denial Auditing**: `AuditService.recordDenied()` executes with `@Transactional(propagation = Propagation.REQUIRES_NEW)` to capture unauthorized attempts even when operations abort.
- [x] **Human-Readable Audit Interface**: Formatted columns displaying filename, actor, recipient, and access badge pills.
- [x] **Inline Permission Management**: Direct `🔐 Change Perms` action button on audit rows for administrators.
- [x] **One-Click Audit Log Export**: Client-side export to both **CSV** (spreadsheet-ready) and **JSON** with filter support.
- [x] **New Audit Event Highlighting**: Unread audit comparison against `localStorage` displaying a glowing `NEW` badge and red accent border.

### G. UI & Design System
- [x] **Netflix Cinematic Dark Mode**: Primary canvas `#141414`, surface dark `#181818`, and signature brand red `#E50914`.
- [x] **Card Hover Highlights**: Smooth 3D lift (`translateY(-3px)`) with glowing red theme border on hover.
- [x] **Digital Protection Vault Emblem**: Custom vector SVG shield emblem and browser favicon (`favicon.svg`) with cyber circuit traces, circular vault door dial, and central lock core.
- [x] **Real-Time Unread Counters**: Navbar badges showing unread document updates and file requests.

---

## 4. Test Verification & Penetration Suite

### Security Penetration Test Suite (`SecurityAttackTests.java`) — 7/7 Passing:
1. `testCrossTenantDirectObjectReferenceDeniedAndAudited`: Attacker blocked from downloading Victim's UUID; logged as `DENIED`.
2. `testReadOnlyUserCannotEditDocument`: Viewer with read-only blocked from modifying document (HTTP 403).
3. `testImmediateRevocationCutsOffAccess`: Immediate access cutoff verified within milliseconds of revocation.
4. `testAuditTrailImmutabilityTriggerPreventsModifications`: SQL `UPDATE` and `DELETE` on `audit_logs` rejected by database trigger.
5. `testUnauthenticatedAccessRejected`: Missing Bearer token rejected with HTTP 401.
6. `testViewerCannotUploadDocuments`: User registered as `VIEWER` strictly prohibited from uploading (HTTP 403).
7. `testAdminHasFullSupervisoryRightsToAnyDocument`: Verifies `ADMIN` has full supervisory authority to view, download, edit, share, and delete any document.

### Integration Test Suite (`TrustvaultIntegrationTests.java`) — 7/7 Passing:
- Complete end-to-end user registration, authentication, SHA-256 upload, sharing lifecycle, version restoration, soft-delete, and audit trail query.

---

## 5. Verification Commands

```powershell
# Run backend test suite
cd backend
.\mvnw.cmd test

# Run frontend production build
cd ..\frontend
npm run build
```
Both backend tests and frontend Vite production builds pass with **zero errors**.
