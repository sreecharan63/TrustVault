package com.snovasys.trustvault.document.dto;

import com.snovasys.trustvault.document.entity.DocumentVersion;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentVersionResponse(
        UUID id,
        UUID documentId,
        int versionNumber,
        String originalFilename,
        String contentType,
        long fileSize,
        String checksumSha256,
        String uploadedByEmail,
        String uploadedByName,
        OffsetDateTime createdAt
) {
    public static DocumentVersionResponse from(DocumentVersion version) {
        return new DocumentVersionResponse(
                version.getId(),
                version.getDocument().getId(),
                version.getVersionNumber(),
                version.getOriginalFilename(),
                version.getContentType(),
                version.getFileSize(),
                version.getChecksumSha256(),
                version.getUploadedBy() != null ? version.getUploadedBy().getEmail() : null,
                version.getUploadedBy() != null ? version.getUploadedBy().getFullName() : null,
                version.getCreatedAt()
        );
    }
}
