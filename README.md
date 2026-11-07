# TrustVault — Secure Document Sharing with a Real Audit Trail

TrustVault is an enterprise document security and sharing platform designed around one uncompromising standard: **the wrong person cannot access confidential documents, and you can prove exactly who accessed them afterwards**.

---

## 🌐 Live Cloud Deployment

| Component | Platform | Live URL / Connection |
|---|---|---|
| **Frontend UI** | **Vercel** (Edge CDN) | **[https://trust-vault-mu.vercel.app](https://trust-vault-mu.vercel.app)** |
| **Backend REST API** | **Render** (Java 21 / Docker) | **[https://trustvault-16f1.onrender.com](https://trustvault-16f1.onrender.com)** |
| **Managed Database** | **Neon** (PostgreSQL 17.11) | `ep-old-bird-bdzbu0as.c-8.us-east-2.aws.neon.tech` |
| **Source Repository** | **GitHub** (Public) | **[https://github.com/sreecharan63/TrustVault](https://github.com/sreecharan63/TrustVault)** |

---

## 🔑 Test Credentials (All 3 Roles)

To test all permission boundaries, cross-tenant isolation, and administrative controls on the live deployment:

| Role | Email Address | Password | Permissions & Intended Test Workflow |
|---|---|---|---|
| **Administrator** | `test.admin@example.com` | `Password123!` | System officer. Can inspect the global immutable audit trail (`/admin/audit`), review file access requests (`/requests`), and fulfill requests by attaching and sharing files. |
| **Document Owner** | `test.user.a@example.com` | `Password123!` | Document owner. Can upload files, create new versions, grant/revoke permissions to named users, and view document-level activity. |
| **Viewer** | `test.user.b@example.com` | `Password123!` | Recipient. Can view and download shared files under **Shared With Me**, request unshared files from Admin, and cannot edit/delete files without explicit grants. |

*(You can also click **Create Account** on the login page to register your own custom user with at least a 12-character password).*

---

## 🛡️ Core Security Architecture & Non-Negotiable Standards

1. **Server Enforces Every Time**:
   - Access is never guarded purely by hiding UI buttons.
   - Every route (`/download`, `/preview`, `/versions`, `/share`) verifies ownership or active unrevoked permission on the database before serving bytes.
   - Returning `404 Not Found` for unshared documents protects against IDOR UUID enumeration attacks.

2. **Immediate Revocation**:
   - JWT tokens assert identity only (`sub: email`). Permissions are **never baked into token claims**.
   - Permissions are queried live on PostgreSQL on every HTTP request. When revoked (`revoked_at` timestamp set), access is cut off instantly.

3. **Database-Enforced Audit Immutability**:
   - PostgreSQL kernel trigger `trg_audit_logs_immutable` executes `RAISE EXCEPTION` on any direct `UPDATE` or `DELETE` attempt against `audit_logs`.
   - Denied access attempts are committed independently via `@Transactional(propagation = Propagation.REQUIRES_NEW)` so failed attacks are always audited.

---

## 👥 The Three Roles

```
                      ┌────────────────────────────────────────┐
                      │              ADMINISTRATOR             │
                      │ • Global Audit Trail Inspection        │
                      │ • Access Request Queue & Fulfillment   │
                      └──────────────────┬─────────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
  ┌──────────────▼─────────────┐                  ┌──────────────▼─────────────┐
  │       DOCUMENT OWNER       │                  │           VIEWER           │
  │ • Uploads & Versions File  │                  │ • Reads & Downloads File   │
  │ • Grants/Revokes Share     │                  │ • Submits Access Request   │
  │ • Soft-Deletes Document    │                  │ • Denied Edit/Delete/Share │
  └────────────────────────────┘                  └────────────────────────────┘
```

---

## 🧪 Automated Security Test Suite

The test suite includes dedicated penetration tests proving attackers cannot bypass authorization:

```powershell
# Set local test environment variables
$env:TRUSTVAULT_DB_URL="jdbc:postgresql://localhost:5432/trustvault"
$env:TRUSTVAULT_DB_USERNAME="postgres"
$env:TRUSTVAULT_DB_PASSWORD="admin"
$env:TRUSTVAULT_JWT_SECRET="F71F98C8C8D714F1A84FBE32389305A468A2F007B866E869755A66E8A1F8C2BA"

cd backend
.\mvnw.cmd test
```

### Verified Test Scenarios:
1. **`SecurityAttackTests`** (6 Attack Scenarios):
   - `testCrossTenantDirectObjectReferenceDeniedAndAudited`: Attacker fails to download Victim's UUID directly; attempt logged as `DENIED`.
   - `testReadOnlyUserCannotEditDocument`: Viewer with read-only cannot edit or upload new versions (HTTP 403).
   - `testImmediateRevocationCutsOffAccess`: Immediate cutoff verified within milliseconds of owner revocation.
   - `testAuditTrailImmutabilityTriggerPreventsModifications`: SQL `UPDATE` and `DELETE` on `audit_logs` rejected by database trigger.
   - `testUnauthenticatedAccessRejected`: Missing Bearer token yields HTTP 401.
   - `testViewerCannotUploadDocuments`: User registered as `VIEWER` is strictly blocked from uploading documents (HTTP 403).
2. **`TrustvaultIntegrationTests`** (7 Lifecycle Scenarios):
   - Auth flow, SHA-256 upload, sharing lifecycle, version restore, soft deletion, and admin role filtering.

---

## 📁 Repository Deliverables Index

- 🛡️ **[THREATS.md](THREATS.md)**: Comprehensive STRIDE threat model, code defenses, knowingly accepted risks, and mitigation verification.
- 🤖 **[PROMPTS.md](PROMPTS.md)**: 6 dated entries detailing AI steering, identified hallucinations/flaws, and manual engineering corrections.
- 📋 **[docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)**: Full REST API specification with headers, request bodies, and sample responses.
- 📊 **[docs/MIGRATION_VERIFICATION_REPORT.md](docs/MIGRATION_VERIFICATION_REPORT.md)**: 100% database parity verification report between local PostgreSQL 17 and Neon Cloud.
- 💾 **[database/backups/BACKUP_MANIFEST.md](database/backups/BACKUP_MANIFEST.md)**: Cryptographic SHA-256 manifest of the database archive.

---

## 🚀 Running Locally from a Clean Clone

### 1. Prerequisites
- **Java 21 JDK** (Eclipse Temurin recommended)
- **Node.js (v18+) & npm**
- **PostgreSQL 17**

### 2. Backend Setup
```bash
cd backend
# Run Spring Boot (Flyway automatically runs migrations V1 through V7)
./mvnw spring-boot:run
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:5173`.
