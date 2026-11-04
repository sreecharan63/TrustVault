
package com.snovasys.trustvault.document.repository;

import com.snovasys.trustvault.document.entity.Document;
import com.snovasys.trustvault.document.entity.DocumentStatus;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    // Find all active documents belonging to a particular user.
    List<Document> findAllByOwner_IdAndStatusOrderByCreatedAtDesc(
            UUID ownerId,
            DocumentStatus status
    );

    // Find a particular document only if it belongs to the given user.
    Optional<Document> findByIdAndOwner_IdAndStatus(
            UUID documentId,
            UUID ownerId,
            DocumentStatus status
    );
}
