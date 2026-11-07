package com.snovasys.trustvault.document.service;

import com.snovasys.trustvault.audit.service.AuditService;
import com.snovasys.trustvault.document.dto.DocumentShareResponse;
import com.snovasys.trustvault.document.entity.Document;
import com.snovasys.trustvault.document.entity.DocumentPermission;
import com.snovasys.trustvault.document.entity.DocumentStatus;
import com.snovasys.trustvault.document.repository.DocumentPermissionRepository;
import com.snovasys.trustvault.document.repository.DocumentRepository;
import com.snovasys.trustvault.user.entity.AppUser;
import com.snovasys.trustvault.user.repository.AppUserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class DocumentSharingService {

    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final AppUserRepository userRepository;
    private final AuditService auditService;

    public DocumentSharingService(
            DocumentRepository documentRepository,
            DocumentPermissionRepository permissionRepository,
            AppUserRepository userRepository,
            AuditService auditService) {

        this.documentRepository = documentRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    // Backward-compatible overload for 4-argument calls
    @Transactional
    public DocumentShareResponse shareDocument(
            UUID documentId,
            String recipientEmail,
            boolean canRead,
            boolean canDownload,
            String ownerEmail,
            String ipAddress,
            String userAgent) {

        return shareDocument(
                documentId,
                recipientEmail,
                canRead,
                false,
                canDownload,
                ownerEmail,
                ipAddress,
                userAgent
        );
    }

    @Transactional
    public DocumentShareResponse shareDocument(
            UUID documentId,
            String recipientEmail,
            boolean canRead,
            boolean canEdit,
            boolean canDownload,
            String ownerEmail,
            String ipAddress,
            String userAgent) {

        // Resolve the authenticated owner first.
        AppUser owner = userRepository.findByEmail(
                ownerEmail.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        // Validate recipient email.
        if (recipientEmail == null || recipientEmail.isBlank()) {

            recordDenied(
                    owner,
                    "PERMISSION_GRANT",
                    documentId,
                    "RECIPIENT_EMAIL_MISSING",
                    ipAddress,
                    userAgent
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Recipient email is required"
            );
        }

        // At least one permission must be granted.
        if (!canRead && !canEdit && !canDownload) {

            recordDenied(
                    owner,
                    "PERMISSION_GRANT",
                    documentId,
                    "NO_PERMISSION_SELECTED",
                    ipAddress,
                    userAgent
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one permission must be granted"
            );
        }

        // Edit or download permission requires read permission.
        if ((canEdit || canDownload) && !canRead) {
            canRead = true;
        }

        // Verify document ownership.
        Document document = documentRepository
                .findByIdAndOwner_IdAndStatus(
                        documentId,
                        owner.getId(),
                        DocumentStatus.ACTIVE
                )
                .orElseThrow(() -> {

                    recordDenied(
                            owner,
                            "PERMISSION_GRANT",
                            documentId,
                            "DOCUMENT_NOT_OWNED_OR_NOT_ACTIVE",
                            ipAddress,
                            userAgent
                    );

                    return new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Document not found"
                    );
                });

        // Find the registered recipient.
        AppUser recipient = userRepository.findByEmail(
                recipientEmail.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() -> {

            recordDenied(
                    owner,
                    "PERMISSION_GRANT",
                    documentId,
                    "RECIPIENT_NOT_FOUND",
                    ipAddress,
                    userAgent
            );

            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Recipient user not found"
            );
        });

        // Prevent sharing with oneself.
        if (owner.getId().equals(recipient.getId())) {

            recordDenied(
                    owner,
                    "PERMISSION_GRANT",
                    documentId,
                    "SELF_SHARING_NOT_ALLOWED",
                    ipAddress,
                    userAgent
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "You cannot share a document with yourself"
            );
        }

        // Do not share with disabled accounts.
        if (!recipient.isEnabled()) {

            recordDenied(
                    owner,
                    "PERMISSION_GRANT",
                    documentId,
                    "RECIPIENT_ACCOUNT_DISABLED",
                    ipAddress,
                    userAgent
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Recipient account is disabled"
            );
        }

        // Prevent duplicate active permissions.
        boolean alreadyShared =
                permissionRepository
                        .existsByDocument_IdAndGrantee_IdAndRevokedAtIsNull(
                                documentId,
                                recipient.getId()
                        );

        if (alreadyShared) {

            recordDenied(
                    owner,
                    "PERMISSION_GRANT",
                    documentId,
                    "ACTIVE_PERMISSION_ALREADY_EXISTS",
                    ipAddress,
                    userAgent
            );

            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Document is already shared with this user"
            );
        }

        // Create a new permission record.
        DocumentPermission permission = new DocumentPermission();

        permission.setDocument(document);
        permission.setGrantee(recipient);
        permission.setGrantedBy(owner);
        permission.setCanRead(canRead);
        permission.setCanEdit(canEdit);
        permission.setCanDownload(canDownload);

        // Save the permission.
        DocumentPermission savedPermission =
                permissionRepository.saveAndFlush(permission);

        // Record successful permission grant.
        auditService.recordSuccess(
                owner.getId(),
                owner.getEmail(),
                "PERMISSION_GRANT",
                "DOCUMENT",
                document.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of(
                        "recipientEmail", recipient.getEmail(),
                        "canRead", canRead,
                        "canEdit", canEdit,
                        "canDownload", canDownload,
                        "permissionId", savedPermission.getId().toString()
                )
        );

        return new DocumentShareResponse(
                savedPermission.getId(),
                savedPermission.getDocument().getId(),
                savedPermission.getGrantee().getEmail(),
                savedPermission.getGrantee().getFullName(),
                savedPermission.isCanRead(),
                savedPermission.isCanEdit(),
                savedPermission.isCanDownload(),
                savedPermission.getGrantedAt()
        );
    }

    @Transactional
    public DocumentShareResponse updateSharing(
            UUID documentId,
            String recipientEmail,
            boolean canRead,
            boolean canEdit,
            boolean canDownload,
            String ownerEmail,
            String ipAddress,
            String userAgent) {

        AppUser owner = userRepository.findByEmail(
                ownerEmail.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        // Verify document ownership.
        Document document = documentRepository
                .findByIdAndOwner_IdAndStatus(
                        documentId,
                        owner.getId(),
                        DocumentStatus.ACTIVE
                )
                .orElseThrow(() -> {
                    recordDenied(
                            owner,
                            "PERMISSION_UPDATE",
                            documentId,
                            "DOCUMENT_NOT_OWNED_OR_NOT_ACTIVE",
                            ipAddress,
                            userAgent
                    );
                    return new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Document not found"
                    );
                });

        if (recipientEmail == null || recipientEmail.isBlank()) {
            recordDenied(
                    owner,
                    "PERMISSION_UPDATE",
                    documentId,
                    "RECIPIENT_EMAIL_MISSING",
                    ipAddress,
                    userAgent
            );
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Recipient email is required"
            );
        }

        if (!canRead && !canEdit && !canDownload) {
            recordDenied(
                    owner,
                    "PERMISSION_UPDATE",
                    documentId,
                    "NO_PERMISSION_SELECTED",
                    ipAddress,
                    userAgent
            );
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "At least one permission must be granted"
            );
        }

        if ((canEdit || canDownload) && !canRead) {
            canRead = true;
        }

        AppUser recipient = userRepository.findByEmail(
                recipientEmail.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() -> {
            recordDenied(
                    owner,
                    "PERMISSION_UPDATE",
                    documentId,
                    "RECIPIENT_NOT_FOUND",
                    ipAddress,
                    userAgent
            );
            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Recipient user not found"
            );
        });

        DocumentPermission permission = permissionRepository
                .findByDocument_IdAndGrantee_IdAndRevokedAtIsNull(
                        documentId,
                        recipient.getId()
                )
                .orElseThrow(() -> {
                    recordDenied(
                            owner,
                            "PERMISSION_UPDATE",
                            documentId,
                            "ACTIVE_PERMISSION_NOT_FOUND",
                            ipAddress,
                            userAgent
                    );
                    return new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Active sharing permission not found"
                    );
                });

        permission.setCanRead(canRead);
        permission.setCanEdit(canEdit);
        permission.setCanDownload(canDownload);

        DocumentPermission savedPermission = permissionRepository.saveAndFlush(permission);

        auditService.recordSuccess(
                owner.getId(),
                owner.getEmail(),
                "PERMISSION_UPDATE",
                "DOCUMENT",
                document.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of(
                        "recipientEmail", recipient.getEmail(),
                        "canRead", canRead,
                        "canEdit", canEdit,
                        "canDownload", canDownload,
                        "permissionId", savedPermission.getId().toString()
                )
        );

        return new DocumentShareResponse(
                savedPermission.getId(),
                savedPermission.getDocument().getId(),
                savedPermission.getGrantee().getEmail(),
                savedPermission.getGrantee().getFullName(),
                savedPermission.isCanRead(),
                savedPermission.isCanEdit(),
                savedPermission.isCanDownload(),
                savedPermission.getGrantedAt()
        );
    }

    @Transactional
    public void revokeSharing(
            UUID documentId,
            String recipientEmail,
            String ownerEmail,
            String ipAddress,
            String userAgent) {

        AppUser owner = userRepository.findByEmail(
                ownerEmail.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        // Verify document ownership.
        documentRepository.findByIdAndOwner_IdAndStatus(
                documentId,
                owner.getId(),
                DocumentStatus.ACTIVE
        ).orElseThrow(() -> {

            recordDenied(
                    owner,
                    "PERMISSION_REVOKE",
                    documentId,
                    "DOCUMENT_NOT_OWNED_OR_NOT_ACTIVE",
                    ipAddress,
                    userAgent
            );

            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Document not found"
            );
        });

        if (recipientEmail == null || recipientEmail.isBlank()) {

            recordDenied(
                    owner,
                    "PERMISSION_REVOKE",
                    documentId,
                    "RECIPIENT_EMAIL_MISSING",
                    ipAddress,
                    userAgent
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Recipient email is required"
            );
        }

        AppUser recipient = userRepository.findByEmail(
                recipientEmail.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() -> {

            recordDenied(
                    owner,
                    "PERMISSION_REVOKE",
                    documentId,
                    "RECIPIENT_NOT_FOUND",
                    ipAddress,
                    userAgent
            );

            return new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Recipient user not found"
            );
        });

        DocumentPermission permission = permissionRepository
                .findByDocument_IdAndGrantee_IdAndRevokedAtIsNull(
                        documentId,
                        recipient.getId()
                )
                .orElseThrow(() -> {

                    recordDenied(
                            owner,
                            "PERMISSION_REVOKE",
                            documentId,
                            "ACTIVE_PERMISSION_NOT_FOUND",
                            ipAddress,
                            userAgent
                    );

                    return new ResponseStatusException(
                            HttpStatus.NOT_FOUND,
                            "Active sharing permission not found"
                    );
                });

        // Revoke the active permission.
        permission.setRevokedAt(OffsetDateTime.now());

        permissionRepository.saveAndFlush(permission);

        // Record successful revocation.
        auditService.recordSuccess(
                owner.getId(),
                owner.getEmail(),
                "PERMISSION_REVOKE",
                "DOCUMENT",
                documentId,
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of(
                        "recipientEmail", recipient.getEmail(),
                        "permissionId", permission.getId().toString()
                )
        );
    }

    @Transactional(readOnly = true)
    public List<DocumentShareResponse> getDocumentPermissions(UUID documentId, String ownerEmail) {
        AppUser owner = userRepository.findByEmail(
                ownerEmail.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        documentRepository.findByIdAndOwner_IdAndStatus(
                documentId,
                owner.getId(),
                DocumentStatus.ACTIVE
        ).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Document not found"
        ));

        List<DocumentPermission> permissions =
                permissionRepository.findAllByDocument_IdAndRevokedAtIsNull(documentId);

        return permissions.stream()
                .map(p -> new DocumentShareResponse(
                        p.getId(),
                        p.getDocument().getId(),
                        p.getGrantee().getEmail(),
                        p.getGrantee().getFullName(),
                        p.isCanRead(),
                        p.isCanEdit(),
                        p.isCanDownload(),
                        p.getGrantedAt()
                ))
                .toList();
    }

    /**
     * Records denied permission operations.
     *
     * AuditService.recordDenied() uses REQUIRES_NEW, so the denial
     * remains recorded even when the current operation throws
     * an exception and its transaction rolls back.
     */
    private void recordDenied(
            AppUser actor,
            String eventType,
            UUID documentId,
            String reason,
            String ipAddress,
            String userAgent) {

        auditService.recordDenied(
                actor.getId(),
                actor.getEmail(),
                eventType,
                "DOCUMENT",
                documentId,
                "DENIED",
                ipAddress,
                userAgent,
                Map.of("reason", reason)
        );
    }
}
