
package com.snovasys.trustvault.document.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String originalFilename,
        String description,
        String contentType,
        long fileSize,
        String checksumSha256,
        int currentVersionNumber,
        String status,
        OffsetDateTime createdAt
) {}
