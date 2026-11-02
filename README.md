# TrustVault – Secure Document Sharing with a Real Audit Trail

## Project Overview

TrustVault is a secure document-sharing application designed to protect confidential documents through role-based authentication, document-level access permissions, and an audit trail.

The system aims to ensure that only authorized users can access, download, modify, or delete documents. It also records important activities to support accountability and security monitoring.

## Project Objectives

- Implement secure user authentication.
- Support Administrator, Document Owner, and Viewer roles.
- Allow users to upload, search, and manage documents.
- Provide document-level access permissions.
- Allow owners to grant and revoke document access.
- Maintain an audit trail of important activities.
- Prevent unauthorized document access.
- Support document versioning.
- Provide administrative monitoring and activity tracking.

## Technology Stack

- **Backend:** Java 21, Spring Boot
- **Security:** Spring Security, JWT, BCrypt
- **Frontend:** React, Vite
- **Database:** PostgreSQL
- **ORM:** Spring Data JPA, Hibernate
- **Database Migrations:** Flyway
- **Testing:** JUnit 5, Mockito
- **Version Control:** Git and GitHub

## Project Structure

```text
TrustVault/
├── backend/
├── frontend/
├── database/
├── docs/
├── .gitignore
└── README.md
```

## Security Principles

- Enforce authorization on the server side.
- Check document permissions before every protected operation.
- Store passwords securely using password hashing.
- Keep uploaded documents outside publicly accessible directories.
- Record successful and failed access attempts.
- Protect audit records against unauthorized modification.
- Never expose passwords, tokens, or secrets in source control.

## Project Status

Under development.

## Documentation

Additional documentation will include:

- `PROJECT_STATUS.md` – Development progress.
- `TESTS.md` – Test cases and results.
- `PROMPTS.md` – AI usage and engineering decisions.
- `API_DOCUMENTATION.md` – Backend API reference.

## Running the Application

Setup and execution instructions will be added after backend, frontend, and database configuration.

## Author

Individual project developed for the Snovasys Fresher Hiring Challenge.
