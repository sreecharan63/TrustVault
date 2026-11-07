package com.snovasys.trustvault.document.repository;

import com.snovasys.trustvault.document.entity.DocumentPermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentPermissionRepository
        extends JpaRepository<DocumentPermission, UUID> {

    // Find an active permission for a particular document and user
    Optional<DocumentPermission>
    findByDocument_IdAndGrantee_IdAndRevokedAtIsNull(
            UUID documentId,
            UUID granteeId
    );

    // Find all active documents shared with a particular user
    List<DocumentPermission>
    findAllByGrantee_IdAndRevokedAtIsNull(UUID granteeId);

    // Find all active permissions granted by a particular user
    List<DocumentPermission>
    findAllByGrantedBy_IdAndRevokedAtIsNull(UUID grantedById);

    // Find all active permissions for a document
    List<DocumentPermission>
    findAllByDocument_IdAndRevokedAtIsNull(UUID documentId);

    // Check whether an active permission already exists
    boolean existsByDocument_IdAndGrantee_IdAndRevokedAtIsNull(
            UUID documentId,
            UUID granteeId
    );
}
