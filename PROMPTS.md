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

---

### Entry 7: 2026-11-08 — Database Migration Resilience: Automated Flyway Repair Strategy
- **Prompt to AI**:  
  *"Implement password reset tokens with timed expiry and add Document Owner and Viewer roles to the system."*
- **What it produced**:  
  The AI added Flyway migrations `V6__create_password_reset_tokens.sql` and `V7__add_roles_document_owner_and_viewer.sql`. However, when deployed to Render, Flyway failed validation on boot because a previous interrupted deployment left an unrecovered row in `flyway_schema_history`, causing Spring Boot to exit with status 1 on startup.
- **What was wrong with it**:  
  Flyway default behavior halts the entire application on any schema validation discrepancy or failed migration attempt until manual database intervention (`flyway repair`). In a headless cloud environment (Render), this permanently locks the backend offline.
- **What was done instead**:  
  Implemented `FlywayConfig.java` registering a custom `FlywayMigrationStrategy` bean. On every application boot, it executes `flyway.repair()` to clear stale failures and align checksums before executing `flyway.migrate()`, guaranteeing automatic self-healing deployments.
- **Commit Reference**: [`7fb54aa`](https://github.com/sreecharan63/TrustVault/commit/7fb54aa) — *fix(flyway): auto-repair schema history on startup, fix requests blank screen crash, modernize permission buttons, and enrich audit logs*

---

### Entry 8: 2026-11-08 — UI Reliability: React Pipeline Declaration Order & Humanized Audit Logs
- **Prompt to AI**:  
  *"Fix the requests section being completely blank, make audit logs understandable with document name and actor/recipient details, and let admin modify permissions right from the audit trail."*
- **What it produced**:  
  The AI attempted to sort and filter requests in `RequestsPage.jsx`, but declared `const sortedRequests = [...filteredRequests]` before `filteredRequests` was initialized, throwing a runtime `ReferenceError` that crashed the entire component tree into a blank screen.
- **What was wrong with it**:  
  Referencing computed state before definition unmounted the React app silently in production. Additionally, audit logs were displaying raw JSON strings for access details rather than human-readable indicators.
- **What was done instead**:  
  1. Reordered `RequestsPage.jsx` logic to declare `filteredRequests` before `sortedRequests` with defensive fallbacks for null timestamps.
  2. Enriched audit log generation in `DocumentSharingService.java` to persist `filename` and `recipientName` into the audit details map.
  3. Redesigned `AdminAuditPage.jsx` with structured columns (`Timestamp`, `Action Badge`, `Document`, `From ➔ To`, `Access Pills`, `Outcome`, and an inline `🔐 Change Perms` button connecting directly to `PermissionsModal.jsx`).
  4. Redesigned `ShareModal.jsx` and `PermissionsModal.jsx` from plain HTML checkboxes to interactive glowing status button cards.
- **Commit Reference**: [`7fb54aa`](https://github.com/sreecharan63/TrustVault/commit/7fb54aa) — *fix(flyway): auto-repair schema history on startup, fix requests blank screen crash, modernize permission buttons, and enrich audit logs*

---

### Entry 9: 2026-11-08 — Visual Design System: Cinematic Dark Mode & Browser Autofill Override
- **Prompt to AI**:  
  *"Apply Netflix theme colors to our project, add password view toggle in password fields, and fix white background showing in login inputs."*
- **What it produced**:  
  The AI added password toggle states and updated CSS variables. However, when users opened the page with Google Chrome or password managers, autofilled inputs turned bright white with black text, completely clashing with the dark theme.
- **What was wrong with it**:  
  Chromium-based browsers inject a user-agent stylesheet rule (`-webkit-box-shadow: 0 0 0 30px white inset !important`) whenever saved credentials are autofilled. Standard background CSS cannot override this without specific WebKit pseudo-selectors.
- **What was done instead**:  
  1. Added explicit `-webkit-autofill` overrides in `index.css` using `box-shadow: 0 0 0 1000px #111111 inset !important` and `-webkit-text-fill-color: #ffffff !important` with a `50000s` transition delay to permanently lock autofill inputs in dark mode.
  2. Integrated `Eye` and `EyeOff` icons from `lucide-react` across Login, Register, and Forgot Password inputs.
  3. Created high-resolution SVG favicon (`favicon.svg`) and brand component `TrustVaultLogo.jsx` featuring an outer Netflix Red cyber shield with glowing micro-nodes, circular vault door dial, and central lock core.
- **Commit References**:  
  - [`2a59168`](https://github.com/sreecharan63/TrustVault/commit/2a59168) — *feat(theme): apply official Netflix dark and red cinematic theme across TrustVault UI*  
  - [`5cf3862`](https://github.com/sreecharan63/TrustVault/commit/5cf3862) — *feat(auth): add show/hide password toggle with Eye/EyeOff icons across all password fields*  
  - [`5b263d3`](https://github.com/sreecharan63/TrustVault/commit/5b263d3) — *fix(css): override browser autofill white background to maintain dark theme across all inputs*  
  - [`be51b4e`](https://github.com/sreecharan63/TrustVault/commit/be51b4e) — *feat(branding): add custom digital protection vault logo, favicon, and brand subtitle across UI*

---

### Entry 10: 2026-11-08 — Compliance & Usability: Audit Log Exports & Card Hover Highlights
- **Prompt to AI**:  
  *"Add an upload option in share by me section, add audit download option and highlight newly created audits, and when I hover the cards the borders need to be highlighted with the theme."*
- **What it produced**:  
  The AI added basic download buttons and hover styles.
- **What was wrong with it**:  
  Audit logs had no client-side export parsing, requiring raw server responses. New audit records had no distinction from historical logs, making ongoing operational monitoring tedious.
- **What was done instead**:  
  1. In `SharedByMePage.jsx`, added `📤 Upload & Share` with automatic chaining: uploading a document immediately triggers `ShareModal.jsx` for the newly created file.
  2. In `AdminAuditPage.jsx`, added client-side **`📥 Download Audit CSV`** and **`📥 Export JSON`** generating compliant export files respecting active filter parameters.
  3. Implemented unread audit tracking comparing timestamps against `localStorage` last-seen time, displaying a **`NEW`** glowing badge pill and ambient Netflix Red gradient row highlight for recent audit events.
  4. Updated `index.css` and `DocumentCard.jsx` with smooth 3D lift (`translateY(-3px)`) and glowing Netflix Red border highlights (`border-color: #E50914 !important; box-shadow: 0 8px 26px rgba(229, 9, 20, 0.35) !important`) on card hover.
- **Commit References**:  
  - [`f170a89`](https://github.com/sreecharan63/TrustVault/commit/f170a89) — *feat(shared-by-me): add upload and share option with instant share modal chaining*  
  - [`f0b6f80`](https://github.com/sreecharan63/TrustVault/commit/f0b6f80) — *feat(audit): add CSV/JSON audit log download export and highlight newly created audits with Netflix Red glowing indicator*  
  - [`9420f80`](https://github.com/sreecharan63/TrustVault/commit/9420f80) — *feat(ui): add theme border highlight and subtle glow effect when hovering over cards*

---

### Entry 11: 2026-11-08 — Interactive Document Detail & Permissions Hub Modal
- **Prompt to AI**:  
  *"in dashboard when a doc is clicked it should show the permissions then user can choose what he want to do withit"*
- **What it produced**:  
  Direct action triggers without a centralized document inspection or permission overview view.
- **What was done instead**:  
  1. Created `DocDetailModal.jsx` acting as a comprehensive Permissions & Actions Hub.
  2. Displays effective permissions for the authenticated user (Read, Download, Edit & Versioning, Admin/Owner status).
  3. Lists active collaborators and their assigned permission levels for owners and administrators.
  4. Provides immediate action triggers for Preview/Open, Download, Edit/Upload New Version, Share, Manage Permissions, Version History, Audit Activity Trail, and Delete Document.
- **Commit References**:  
  - [`8e4b85c`](https://github.com/sreecharan63/TrustVault/commit/8e4b85c) — *feat(dashboard): add comprehensive document detail and permissions hub modal on card click*

---

### Entry 12: 2026-11-08 — In-App Document Preview Modal & Async Popup Blocker Fix
- **Prompt to AI**:  
  *"the preview is not working check once"*
- **What was wrong with it**:  
  1. **Async Popup Blocker**: Invoking `window.open(url, '_blank')` after an asynchronous `await previewDocument(doc.id)` broke the browser's user activation gesture tick; modern browsers (Chrome/Firefox/Safari) silently blocked the popup.
  2. **Blob Error Masking**: With `responseType: 'blob'`, server error responses (e.g., 404 or 403) returned JSON bodies wrapped as a `Blob`, causing `err.response.data.message` to evaluate to `undefined` and displaying generic "Access denied" errors.
  3. **Backend Audit & Resilience**: Missing `auditService.recordSuccess` on preview in `DocumentService.java` and unhandled `IOException` when local storage files are missing on ephemeral cloud container restarts.
- **What was done instead**:  
  1. Built `PreviewModal.jsx`: an embedded in-app Netflix dark theme lightbox viewer supporting:
     - PDF native iframe viewer with built-in pagination and toolbars
     - Image viewer (PNG, JPG, SVG, WebP, GIF) with zoom controls (Zoom In, Zoom Out, Reset 100%)
     - Text / Code viewer (JSON, CSV, Markdown, JS, TS, Log, SQL) with line wrapping and one-click copy
     - Video & Audio HTML5 media players
     - Formatted fallback for unsupported binary formats with direct one-click buttons (`⬇️ Download File`, `↗️ Open in New Tab`)
  2. Replaced fragile `window.open` calls with embedded `PreviewModal` and user-initiated direct `<a>` link buttons (`↗️ Open New Tab`) that browsers never block.
  3. Added proper `Blob.text()` error parsing to unpack real backend error messages from blob responses.
  4. Added `DOCUMENT_PREVIEW` success audit logging in `DocumentService.java` and translated storage `IOException` to clean HTTP 404 with helpful guidance.
  5. Added one-click preview actions in `MyDocumentsPage.jsx` and `SharedWithMePage.jsx`.
- **Commit References**:  
  - [`ef4499d`](https://github.com/sreecharan63/TrustVault/commit/ef4499d) — *fix(preview): add in-app preview modal viewer, record preview audit logs, and improve missing file handling*

---

### Entry 13: 2026-11-08 — Database-Backed Blob Storage & Transaction/Download Fixes
- **Prompt to AI**:  
  *"download and preview is not working check once"*
- **What was wrong with it**:  
  1. **PostgreSQL Read-Only Transaction Conflict**: `previewDocument` was annotated with `@Transactional(readOnly = true)`. When it called `auditService.recordSuccess(...)` to log the preview event, PostgreSQL aborted with `PSQLException: cannot execute INSERT in a read-only transaction`.
  2. **Premature Object URL Revocation**: In `DocDetailModal.jsx`, `MyDocumentsPage.jsx`, and `SharedWithMePage.jsx`, `URL.revokeObjectURL(url)` was called synchronously on the very next line right after `a.click()`. In Chromium browsers, this aborted the asynchronous download manager before blob bytes (like `suraj.docx` at 12.69 MB) could stream to disk.
  3. **Ephemeral Container Data Loss on Render**: Render free-tier web services restart on new containers with an empty local filesystem (`/app/storage`), causing documents uploaded prior to container restarts to disappear from disk.
  4. **Null Pointer Risk in Audit Maps**: `Map.of()` in `downloadDocument` threw `NullPointerException` if `contentType` was null.
- **What was done instead**:  
  1. **Flyway Migration V8 (`document_blobs`)**: Created persistent byte storage table in PostgreSQL (`storage_key VARCHAR(500) PRIMARY KEY, data BYTEA NOT NULL`) with index.
  2. **Dual-Layer File Storage Service**: Updated `FileStorageService.java` to save uploads to disk and PostgreSQL simultaneously. On `load()`, if local container disk lacks the file after a restart, it automatically recovers the file bytes from PostgreSQL into local disk storage and serves it seamlessly.
  3. **Transaction Fix**: Changed `previewDocument` from `@Transactional(readOnly = true)` to `@Transactional` so audit records can be cleanly written.
  4. **Browser Download Lifecycle**: Appended `<a>` to `document.body` and deferred `URL.revokeObjectURL(url)` by 60 seconds so downloads complete reliably without network abortion.
  5. **Null-Safe Audit Details & Global Exception Handler**: Protected `Map.of` against null fields and added general exception handling in `GlobalExceptionHandler.java`.
- **Commit References**:  
  - [`ce81d3b`](https://github.com/sreecharan63/TrustVault/commit/ce81d3b) — *fix(storage): add database blob persistence, fix read-only preview transaction, and prevent premature download url revocation*

---

### Entry 14: 2026-11-09 — Replace Search Emoji with Vector Line Design Icon
- **Prompt to AI**:  
  *"replace the search icon emoji with search design line"*
- **What was wrong with it**:  
  Raw unicode search emojis (`🔍`) were embedded directly inside input placeholders and button labels, appearing outdated and inconsistent across platforms and operating systems.
- **What was done instead**:  
  1. Replaced the `🔍` placeholder emoji with a sleek vector outline line icon (`<Search className="search-icon" size={17} strokeWidth={2} />`) from `lucide-react`.
  2. Implemented `.search-input-wrapper` in `index.css` with absolute icon positioning, inset input padding, and smooth Netflix Red accent focus highlight (`:focus-within`).
  3. Updated [`MyDocumentsPage.jsx`](file:///d:/TrustVault/frontend/src/pages/MyDocumentsPage.jsx) and [`SharedWithMePage.jsx`](file:///d:/TrustVault/frontend/src/pages/SharedWithMePage.jsx) to use the new line icon wrapper.
  4. Updated [`AdminAuditPage.jsx`](file:///d:/TrustVault/frontend/src/pages/AdminAuditPage.jsx) to replace `🔍 Filter` with `<Filter size={15} /> Filter`.
  5. Updated [`PreviewModal.jsx`](file:///d:/TrustVault/frontend/src/components/PreviewModal.jsx) to replace `🔍-` and `🔍+` zoom buttons with `<ZoomOut size={13} />` and `<ZoomIn size={13} />` line icons.
- **Commit References**:  
  - `Upcoming Commit` — *feat(ui): replace search and zoom emojis with vector line design icons and animated focus wrapper*
