package com.snovasys.trustvault.audit.repository;

import com.snovasys.trustvault.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.UUID;

public interface AuditLogRepository extends
        JpaRepository<AuditLog, UUID>,
        JpaSpecificationExecutor<AuditLog> {

    List<AuditLog> findAllByResourceIdOrderByCreatedAtDesc(UUID resourceId);
}
