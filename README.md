# TrustVault – Secure Document Sharing with a Real Audit Trail

TrustVault is a production-grade full-stack document management and sharing application built for the **Snovasys Fresher Hiring Challenge**. It protects sensitive documents using strict server-side authorization, independent read/edit/download permissions, automated document versioning, and an immutable PostgreSQL audit trail.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Java 21 JDK**
- **Node.js (v18+) & npm**
- **PostgreSQL 17** running on `localhost:5432` with database `trustvault`

### 2. Running the Backend
From the repository root:

```powershell
$env:TRUSTVAULT_DB_URL="jdbc:postgresql://localhost:5432/trustvault"
$env:TRUSTVAULT_DB_USERNAME="postgres"
$env:TRUSTVAULT_DB_PASSWORD="admin"
$env:TRUSTVAULT_JWT_SECRET="F71F98C8C8D714F1A84FBE32389305A468A2F007B866E869755A66E8A1F8C2BA"

cd backend
.\mvnw.cmd spring-boot:run
```
The backend starts at `http://localhost:8080`.

### 3. Running the Frontend
In a separate terminal:

```powershell
cd frontend
npm install
npm run dev
```
The frontend is available at `http://localhost:5173`.

### 4. Running Automated Tests
```powershell
$env:TRUSTVAULT_DB_URL="jdbc:postgresql://localhost:5432/trustvault"
$env:TRUSTVAULT_DB_USERNAME="postgres"
$env:TRUSTVAULT_DB_PASSWORD="admin"
$env:TRUSTVAULT_JWT_SECRET="F71F98C8C8D714F1A84FBE32389305A468A2F007B866E869755A66E8A1F8C2BA"

cd backend
.\mvnw.cmd test
```

---

## 🛠️ Architecture & Technology Stack

- **Backend:** Java 21, Spring Boot 4.0.0, Spring Data JPA, Hibernate ORM
- **Security:** Spring Security (stateless session), BCrypt (strength 12), JJWT (HS512)
- **Database & Migrations:** PostgreSQL 17, Flyway migrations (V1, V2, V3)
- **Frontend:** React 18, Vite, React Router v6, Axios
- **Storage:** Isolated filesystem storage with SHA-256 integrity verification
- **Audit Immutability:** PostgreSQL trigger preventing any `UPDATE` or `DELETE` on `audit_logs`

---

## 🔐 Key Features

1. **Granular Permissions:** Separate `canRead`, `canEdit`, and `canDownload` flags per document recipient. Immediate revocation stops access in real-time.
2. **Document Versioning:** Modifying document files preserves historical snapshots and increments version count. Prior versions can be inspected, downloaded, or restored.
3. **Comprehensive Audit Trail:** All sensitive operations (`DOCUMENT_UPLOAD`, `DOCUMENT_DOWNLOAD`, `DOCUMENT_EDIT`, `DOCUMENT_DELETE`, `PERMISSION_GRANT`, `PERMISSION_REVOKE`, etc.) are recorded with actor, IP, outcome, and timestamp.
4. **Role Segregation:** Separation between document ownership and system roles (`ADMIN` and `USER`). Administrators monitor security audit events without automatic backdoor access to private document contents.
5. **Interactive UI:** Clean dark-mode interface with live search, category tagging, document sharing modals, version history browser, and administrator audit dashboard.

---

## 📂 Documentation

- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md) – Detailed REST API specification.
- [docs/TESTS.md](docs/TESTS.md) – Automated test suite and security verification details.
- [PROJECT_STATUS.md](PROJECT_STATUS.md) – Implementation status and verification checklist.
