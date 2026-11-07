package com.snovasys.trustvault.document.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentShareResponse(
        UUID permissionId,
        UUID documentId,
        String recipientEmail,
        String recipientFullName,
        boolean canRead,
        boolean canEdit,
        boolean canDownload,
        OffsetDateTime grantedAt
) {
    // Backward-compatible 7-arg constructor
    public DocumentShareResponse(
            UUID permissionId,
            UUID documentId,
            String recipientEmail,
            String recipientFullName,
            boolean canRead,
            boolean canDownload,
            OffsetDateTime grantedAt
    ) {
        this(
                permissionId,
                documentId,
                recipientEmail,
                recipientFullName,
                canRead,
                false,
                canDownload,
                grantedAt
        );
    }
}
