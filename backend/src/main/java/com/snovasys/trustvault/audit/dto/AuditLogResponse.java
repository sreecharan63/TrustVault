package com.snovasys.trustvault.audit.dto;

import com.snovasys.trustvault.audit.entity.AuditLog;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record AuditLogResponse(
        UUID id,
        UUID actorUserId,
        String actorEmail,
        String eventType,
        String resourceType,
        UUID resourceId,
        String outcome,
        Map<String, Object> details,
        Instant createdAt
) {
    public static AuditLogResponse from(AuditLog auditLog) {
        return new AuditLogResponse(
                auditLog.getId(),
                auditLog.getActorUserId(),
                auditLog.getActorEmail(),
                auditLog.getEventType(),
                auditLog.getResourceType(),
                auditLog.getResourceId(),
                auditLog.getOutcome(),
                auditLog.getDetails(),
                auditLog.getCreatedAt()
        );
    }
}