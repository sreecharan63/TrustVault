package com.snovasys.trustvault.document.repository;

import com.snovasys.trustvault.document.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {

    List<DocumentVersion> findAllByDocument_IdOrderByVersionNumberDesc(UUID documentId);

    Optional<DocumentVersion> findByDocument_IdAndVersionNumber(UUID documentId, int versionNumber);

    long countByDocument_Id(UUID documentId);
}
