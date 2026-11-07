package com.snovasys.trustvault.document.repository;

import com.snovasys.trustvault.document.entity.Document;
import com.snovasys.trustvault.document.entity.DocumentStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    // Find all active documents belonging to a particular user.
    List<Document> findAllByOwner_IdAndStatusOrderByCreatedAtDesc(
            UUID ownerId,
            DocumentStatus status
    );

    List<Document> findAllByOwner_IdAndStatusOrderByUpdatedAtDesc(
            UUID ownerId,
            DocumentStatus status
    );

    // Find a particular document only if it belongs to the given user.
    Optional<Document> findByIdAndOwner_IdAndStatus(
            UUID documentId,
            UUID ownerId,
            DocumentStatus status
    );

    Optional<Document> findByIdAndStatus(
            UUID documentId,
            DocumentStatus status
    );

    long countByOwner_IdAndStatus(
            UUID ownerId,
            DocumentStatus status
    );

    List<Document> findAllByStatusOrderByCreatedAtDesc(
            DocumentStatus status
    );

    List<Document> findAllByStatusOrderByUpdatedAtDesc(
            DocumentStatus status
    );

    long countByStatus(
            DocumentStatus status
    );

    @Query("SELECT DISTINCT d.category FROM Document d WHERE d.owner.id = :ownerId AND d.status = :status AND d.category IS NOT NULL AND d.category <> ''")
    List<String> findDistinctCategoriesByOwner(
            @Param("ownerId") UUID ownerId,
            @Param("status") DocumentStatus status
    );

    @Query("SELECT DISTINCT d.category FROM Document d WHERE d.status = :status AND d.category IS NOT NULL AND d.category <> ''")
    List<String> findDistinctCategoriesByStatus(
            @Param("status") DocumentStatus status
    );
}
