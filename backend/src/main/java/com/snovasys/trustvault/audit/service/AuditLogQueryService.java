package com.snovasys.trustvault.audit.service;

import com.snovasys.trustvault.audit.dto.AuditLogResponse;
import com.snovasys.trustvault.audit.entity.AuditLog;
import com.snovasys.trustvault.audit.repository.AuditLogRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class AuditLogQueryService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogQueryService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public Page<AuditLogResponse> search(
            String actorEmail,
            String eventType,
            String outcome,
            UUID resourceId,
            Instant from,
            Instant to,
            int page,
            int size
    ) {
        Specification<AuditLog> specification = (root, query, criteriaBuilder) -> {

            List<Predicate> predicates = new ArrayList<>();

            if (actorEmail != null && !actorEmail.isBlank()) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("actorEmail")),
                                "%" + actorEmail.trim().toLowerCase() + "%"
                        )
                );
            }

            if (eventType != null && !eventType.isBlank()) {
                predicates.add(
                        criteriaBuilder.equal(
                                root.get("eventType"),
                                eventType.trim()
                        )
                );
            }

            if (outcome != null && !outcome.isBlank()) {
                predicates.add(
                        criteriaBuilder.equal(
                                root.get("outcome"),
                                outcome.trim().toUpperCase()
                        )
                );
            }

            if (resourceId != null) {
                predicates.add(
                        criteriaBuilder.equal(
                                root.get("resourceId"),
                                resourceId
                        )
                );
            }

            if (from != null) {
                predicates.add(
                        criteriaBuilder.greaterThanOrEqualTo(
                                root.get("createdAt"),
                                from
                        )
                );
            }

            if (to != null) {
                predicates.add(
                        criteriaBuilder.lessThanOrEqualTo(
                                root.get("createdAt"),
                                to
                        )
                );
            }

            return criteriaBuilder.and(
                    predicates.toArray(new Predicate[0])
            );
        };

        Sort sort = Sort.by(
                Sort.Order.desc("createdAt"),
                Sort.Order.desc("id")
        );

        Pageable pageable = PageRequest.of(page, size, sort);

        return auditLogRepository.findAll(specification, pageable)
                .map(AuditLogResponse::from);
    }
}