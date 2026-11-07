package com.snovasys.trustvault.audit.controller;

import com.snovasys.trustvault.audit.dto.AuditLogResponse;
import com.snovasys.trustvault.audit.service.AuditLogQueryService;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AuditController {

    private final AuditLogQueryService auditLogQueryService;

    public AuditController(AuditLogQueryService auditLogQueryService) {
        this.auditLogQueryService = auditLogQueryService;
    }

    @GetMapping("/audit-logs")
    public Page<AuditLogResponse> getAuditLogs(
            @RequestParam(required = false) String actorEmail,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String outcome,
            @RequestParam(required = false) UUID resourceId,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            Instant from,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            Instant to,

            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {

        if (page < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page number cannot be negative"
            );
        }

        if (size < 1 || size > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Page size must be between 1 and 100"
            );
        }

        if (from != null && to != null && from.isAfter(to)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "From date cannot be after to date"
            );
        }

        if (outcome != null && !outcome.isBlank()
                && !outcome.equalsIgnoreCase("SUCCESS")
                && !outcome.equalsIgnoreCase("DENIED")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Outcome must be SUCCESS or DENIED"
            );
        }

        return auditLogQueryService.search(
                actorEmail,
                eventType,
                outcome,
                resourceId,
                from,
                to,
                page,
                size
        );
    }
}