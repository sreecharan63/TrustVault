package com.snovasys.trustvault.request.dto;

import com.snovasys.trustvault.request.entity.FileRequest;
import java.time.OffsetDateTime;
import java.util.UUID;

public record FileRequestResponse(
        UUID id,
        UUID requesterId,
        String requesterEmail,
        String requesterName,
        String fileName,
        String accessSpecification,
        String description,
        String status,
        String adminResponse,
        String resolvedByName,
        UUID fulfilledDocumentId,
        String fulfilledDocumentFilename,
        OffsetDateTime createdAt,
        OffsetDateTime resolvedAt
) {
    public static FileRequestResponse from(FileRequest request) {
        return new FileRequestResponse(
                request.getId(),
                request.getRequester().getId(),
                request.getRequester().getEmail(),
                request.getRequester().getFullName(),
                request.getFileName(),
                request.getAccessSpecification(),
                request.getDescription(),
                request.getStatus(),
                request.getAdminResponse(),
                request.getResolvedBy() != null ? request.getResolvedBy().getFullName() : null,
                request.getFulfilledDocument() != null ? request.getFulfilledDocument().getId() : null,
                request.getFulfilledDocument() != null ? request.getFulfilledDocument().getOriginalFilename() : null,
                request.getCreatedAt(),
                request.getResolvedAt()
        );
    }
}
