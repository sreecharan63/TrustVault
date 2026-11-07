# TrustVault Database Backup Manifest

- **Database Name**: `trustvault`
- **PostgreSQL Version**: 17.11 (x64)
- **Backup File**: `trustvault_backup.dump`
- **Backup Format**: PostgreSQL Custom Archive (`pg_dump -Fc` with gzip compression)
- **Backup Timestamp**: 2026-11-07 19:45:44 IST
- **File Size**: 40,509 bytes (40.5 KB)
- **SHA-256 Checksum**: `E49153E080FA887378E8B8EBD6BA76B53DF03106FA504E92E6208E6CE6B19A1B`
- **TOC Entries**: 55 objects verified via `pg_restore --list`

## Included Tables & Data
1. `public.app_users` (11 rows)
2. `public.documents` (26 rows)
3. `public.document_versions` (38 rows)
4. `public.document_permissions` (15 rows)
5. `public.audit_logs` (138 rows)
6. `public.file_requests` (5 rows)
7. `public.flyway_schema_history` (5 migrations, V1 through V5)

## Integrity & Validation Status
- Status: **VALIDATED & VERIFIED**
- All schemas, constraints, foreign keys, unique keys, indexes, triggers (`prevent_audit_log_modification`), and sequences are intact.
