
package com.snovasys.trustvault.audit.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.UUID;

@Service
public class AuditService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AuditService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    // SUCCESS: joins the current business transaction.
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordSuccess(
            UUID actorUserId,
            String actorEmail,
            String eventType,
            String resourceType,
            UUID resourceId,
            String outcome,
            String ipAddress,
            String userAgent,
            Map<String, Object> details
    ) {
        if (!"SUCCESS".equals(outcome)) {
            throw new IllegalArgumentException(
                    "recordSuccess only accepts SUCCESS outcomes"
            );
        }

        insertAuditLog(
                actorUserId, actorEmail, eventType, resourceType,
                resourceId, outcome, ipAddress, userAgent, details
        );
    }

    // Compatibility overload for existing 8-argument calls.
    // User-Agent is stored as NULL.
    @Transactional(propagation = Propagation.MANDATORY)
    public void recordSuccess(
            UUID actorUserId,
            String actorEmail,
            String eventType,
            String resourceType,
            UUID resourceId,
            String outcome,
            String ipAddress,
            Map<String, Object> details
    ) {
        recordSuccessInsert(
                actorUserId, actorEmail, eventType, resourceType,
                resourceId, outcome, ipAddress, null, details
        );
    }

    // DENIED: commits independently of the rejected operation.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordDenied(
            UUID actorUserId,
            String actorEmail,
            String eventType,
            String resourceType,
            UUID resourceId,
            String outcome,
            String ipAddress,
            String userAgent,
            Map<String, Object> details
    ) {
        if (!"DENIED".equals(outcome)) {
            throw new IllegalArgumentException(
                    "recordDenied only accepts DENIED outcomes"
            );
        }

        insertAuditLog(
                actorUserId, actorEmail, eventType, resourceType,
                resourceId, outcome, ipAddress, userAgent, details
        );
    }

    // Compatibility overload for existing 8-argument calls.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordDenied(
            UUID actorUserId,
            String actorEmail,
            String eventType,
            String resourceType,
            UUID resourceId,
            String outcome,
            String ipAddress,
            Map<String, Object> details
    ) {
        if (!"DENIED".equals(outcome)) {
            throw new IllegalArgumentException(
                    "recordDenied only accepts DENIED outcomes"
            );
        }

        insertAuditLog(
                actorUserId, actorEmail, eventType, resourceType,
                resourceId, outcome, ipAddress, null, details
        );
    }

    private void recordSuccessInsert(
            UUID actorUserId,
            String actorEmail,
            String eventType,
            String resourceType,
            UUID resourceId,
            String outcome,
            String ipAddress,
            String userAgent,
            Map<String, Object> details
    ) {
        if (!"SUCCESS".equals(outcome)) {
            throw new IllegalArgumentException(
                    "recordSuccess only accepts SUCCESS outcomes"
            );
        }

        insertAuditLog(
                actorUserId, actorEmail, eventType, resourceType,
                resourceId, outcome, ipAddress, userAgent, details
        );
    }

    // Direct SQL INSERT: Hibernate cannot issue a later UPDATE
    // for an AuditLog entity.
    private void insertAuditLog(
            UUID actorUserId,
            String actorEmail,
            String eventType,
            String resourceType,
            UUID resourceId,
            String outcome,
            String ipAddress,
            String userAgent,
            Map<String, Object> details
    ) {
        String detailsJson;

        try {
            detailsJson = objectMapper.writeValueAsString(
                    details == null ? Map.of() : details
            );
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException(
                    "Could not serialize audit details",
                    exception
            );
        }

        String sql = """
                INSERT INTO audit_logs (
                    id,
                    actor_user_id,
                    actor_email,
                    event_type,
                    resource_type,
                    resource_id,
                    outcome,
                    ip_address,
                    user_agent,
                    details,
                    created_at
                )
                VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb),
                    CURRENT_TIMESTAMP
                )
                """;

        jdbcTemplate.update(
                sql,
                UUID.randomUUID(),
                actorUserId,
                actorEmail,
                eventType,
                resourceType,
                resourceId,
                outcome,
                ipAddress,
                userAgent,
                detailsJson
        );
    }
}
