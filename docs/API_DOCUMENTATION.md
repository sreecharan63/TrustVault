# TrustVault – API Documentation

This document describes the REST API endpoints provided by the TrustVault backend.

**Base URL:** `http://localhost:8080/api`  
**Authentication Scheme:** Bearer JWT in `Authorization` header (`Bearer <accessToken>`).

---

## 1. Authentication Endpoints (`/api/auth`)

### 1.1 Register User
- **Method:** `POST`
- **Path:** `/api/auth/register`
- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response:** `201 Created`
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzUxMiJ...",
    "tokenType": "Bearer",
    "expiresIn": 3600000
  }
  ```

### 1.2 Login User
- **Method:** `POST`
- **Path:** `/api/auth/login`
- **Access:** Public
- **Request Body (JSON):**
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzUxMiJ...",
    "tokenType": "Bearer",
    "expiresIn": 3600000
  }
  ```

### 1.3 Get Current Profile
- **Method:** `GET`
- **Path:** `/api/auth/me`
- **Access:** Authenticated
- **Response:** `200 OK`
  ```json
  {
    "id": "c1f7a8b4-934d-488b-a320-b0c6df81efaa",
    "email": "jane@example.com",
    "fullName": "Jane Doe",
    "role": "USER"
  }
  ```

---

## 2. Document Endpoints (`/api/documents`)

### 2.1 Upload Document
- **Method:** `POST`
- **Path:** `/api/documents/upload`
- **Access:** Authenticated
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file`: Binary file (required)
  - `description`: String (optional)
  - `category`: String (optional)
  - `tags`: Comma-separated tags (optional)
- **Response:** `201 Created` with `DocumentResponse`
- **Audit Event:** `DOCUMENT_UPLOAD`

### 2.2 List My Documents
- **Method:** `GET`
- **Path:** `/api/documents`
- **Access:** Authenticated
- **Query Parameters:**
  - `search`: Filter by original filename, description, or tags (optional)
  - `category`: Filter by category (optional)
- **Response:** `200 OK` (`List<DocumentResponse>`)

### 2.3 List Shared With Me
- **Method:** `GET`
- **Path:** `/api/documents/shared-with-me`
- **Access:** Authenticated
- **Query Parameters:**
  - `search`: Filter query (optional)
  - `category`: Category filter (optional)
- **Response:** `200 OK` (`List<DocumentResponse>`)

### 2.4 List Shared By Me
- **Method:** `GET`
- **Path:** `/api/documents/shared-by-me`
- **Access:** Authenticated
- **Response:** `200 OK` (`List<DocumentResponse>`)

### 2.5 User Dashboard Stats
- **Method:** `GET`
- **Path:** `/api/documents/dashboard-stats`
- **Access:** Authenticated
- **Response:** `200 OK`
  ```json
  {
    "totalDocuments": 5,
    "sharedWithMeCount": 2,
    "sharedByMeCount": 3,
    "categories": ["Finance", "Legal"],
    "recentDocuments": [...]
  }
  ```

### 2.6 Download Document
- **Method:** `GET`
- **Path:** `/api/documents/{documentId}/download`
- **Access:** Authenticated (Owner or recipient with `canDownload = true`)
- **Response:** Binary file with `Content-Disposition: attachment; filename="..."`
- **Audit Event:** `DOCUMENT_DOWNLOAD` (SUCCESS or DENIED)

### 2.7 Preview Document
- **Method:** `GET`
- **Path:** `/api/documents/{documentId}/preview`
- **Access:** Authenticated (Owner or recipient with `canRead = true`)
- **Response:** Inline file stream with `Content-Disposition: inline; filename="..."`
- **Audit Event:** `DOCUMENT_PREVIEW`

### 2.8 Edit Document
- **Method:** `PUT`
- **Path:** `/api/documents/{documentId}`
- **Access:** Authenticated (Owner or recipient with `canEdit = true`)
- **Content-Type:** `multipart/form-data`
- **Form Fields:**
  - `file`: New binary file replacing content (optional; triggers version snapshot)
  - `description`: String (optional)
  - `category`: String (optional)
  - `tags`: String (optional)
- **Response:** `200 OK` with updated `DocumentResponse`
- **Audit Event:** `DOCUMENT_EDIT`

### 2.9 Delete Document (Soft Delete)
- **Method:** `DELETE`
- **Path:** `/api/documents/{documentId}`
- **Access:** Authenticated (Owner only)
- **Response:** `204 No Content`
- **Audit Event:** `DOCUMENT_DELETE`

---

## 3. Versioning Endpoints

### 3.1 List Document Versions
- **Method:** `GET`
- **Path:** `/api/documents/{documentId}/versions`
- **Access:** Authenticated (Owner or reader)
- **Response:** `200 OK` (`List<DocumentVersionResponse>`)

### 3.2 Download Specific Version
- **Method:** `GET`
- **Path:** `/api/documents/{documentId}/versions/{versionNumber}/download`
- **Access:** Authenticated (Owner or recipient with download permission)
- **Response:** Binary stream of historical version

### 3.3 Restore Version
- **Method:** `POST`
- **Path:** `/api/documents/{documentId}/versions/{versionNumber}/restore`
- **Access:** Authenticated (Owner or editor)
- **Response:** `200 OK` with `DocumentResponse`
- **Audit Event:** `DOCUMENT_VERSION_RESTORE`

---

## 4. Sharing & Permissions Endpoints

### 4.1 Share Document
- **Method:** `POST`
- **Path:** `/api/documents/{documentId}/share`
- **Access:** Authenticated (Owner only)
- **Request Body (JSON):**
  ```json
  {
    "recipientEmail": "colleague@example.com",
    "canRead": true,
    "canEdit": false,
    "canDownload": true
  }
  ```
- **Response:** `201 Created`
- **Audit Event:** `PERMISSION_GRANT`

### 4.2 Update Permission
- **Method:** `PUT`
- **Path:** `/api/documents/{documentId}/share`
- **Access:** Authenticated (Owner only)
- **Request Body (JSON):**
  ```json
  {
    "recipientEmail": "colleague@example.com",
    "canRead": true,
    "canEdit": true,
    "canDownload": true
  }
  ```
- **Response:** `200 OK`
- **Audit Event:** `PERMISSION_UPDATE`

### 4.3 Revoke Permission
- **Method:** `DELETE`
- **Path:** `/api/documents/{documentId}/share?recipientEmail={email}`
- **Access:** Authenticated (Owner only)
- **Response:** `204 No Content`
- **Audit Event:** `PERMISSION_REVOKE`

### 4.4 List Document Permissions
- **Method:** `GET`
- **Path:** `/api/documents/{documentId}/permissions`
- **Access:** Authenticated (Owner only)
- **Response:** `200 OK` (`List<DocumentShareResponse>`)

### 4.5 Document Activity Trail
- **Method:** `GET`
- **Path:** `/api/documents/{documentId}/activity`
- **Access:** Authenticated (Owner or grantee)
- **Response:** `200 OK` (`List<AuditLogResponse>`)

---

## 5. Administrator Audit Trail Endpoints (`/api/admin`)

### 5.1 Query Audit Logs
- **Method:** `GET`
- **Path:** `/api/admin/audit-logs`
- **Access:** ADMIN role only (enforced by Spring Security `hasRole('ADMIN')`)
- **Query Parameters:**
  - `actorEmail`: Filter by actor email (optional)
  - `eventType`: Filter by event type, e.g. `DOCUMENT_UPLOAD`, `DOCUMENT_DOWNLOAD` (optional)
  - `outcome`: `SUCCESS` or `DENIED` (optional)
  - `resourceId`: UUID of document or resource (optional)
  - `startDate`: ISO instant / date (optional)
  - `endDate`: ISO instant / date (optional)
  - `page`: Page index (default: `0`)
  - `size`: Page size (default: `20`, max: `100`)
- **Response:** `200 OK` with `Page<AuditLogResponse>`
