package com.snovasys.trustvault.document.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String originalFilename,
        String description,
        String category,
        String tags,
        String contentType,
        long fileSize,
        String checksumSha256,
        int currentVersionNumber,
        String status,
        String ownerEmail,
        String ownerName,
        boolean isOwner,
        boolean canRead,
        boolean canEdit,
        boolean canDownload,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    // Backward-compatible constructor for 9-parameter calls
    public DocumentResponse(
            UUID id,
            String originalFilename,
            String description,
            String contentType,
            long fileSize,
            String checksumSha256,
            int currentVersionNumber,
            String status,
            OffsetDateTime createdAt
    ) {
        this(
                id,
                originalFilename,
                description,
                null,
                null,
                contentType,
                fileSize,
                checksumSha256,
                currentVersionNumber,
                status,
                null,
                null,
                true,
                true,
                true,
                true,
                createdAt,
                createdAt
        );
    }
}
