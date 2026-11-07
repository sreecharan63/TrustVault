package com.snovasys.trustvault.request.entity;

import com.snovasys.trustvault.document.entity.Document;
import com.snovasys.trustvault.user.entity.AppUser;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "file_requests")
public class FileRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requester_id", nullable = false)
    private AppUser requester;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "access_specification", nullable = false, length = 50)
    private String accessSpecification;

    @Column(name = "description", nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "admin_response", columnDefinition = "TEXT")
    private String adminResponse;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private AppUser resolvedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fulfilled_document_id")
    private Document fulfilledDocument;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;

    public FileRequest() {}

    public FileRequest(AppUser requester, String fileName, String accessSpecification, String description) {
        this.requester = requester;
        this.fileName = fileName;
        this.accessSpecification = accessSpecification;
        this.description = description;
        this.status = "PENDING";
        this.createdAt = OffsetDateTime.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }

    public AppUser getRequester() { return requester; }
    public void setRequester(AppUser requester) { this.requester = requester; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getAccessSpecification() { return accessSpecification; }
    public void setAccessSpecification(String accessSpecification) { this.accessSpecification = accessSpecification; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAdminResponse() { return adminResponse; }
    public void setAdminResponse(String adminResponse) { this.adminResponse = adminResponse; }

    public AppUser getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(AppUser resolvedBy) { this.resolvedBy = resolvedBy; }

    public Document getFulfilledDocument() { return fulfilledDocument; }
    public void setFulfilledDocument(Document fulfilledDocument) { this.fulfilledDocument = fulfilledDocument; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }

    public OffsetDateTime getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(OffsetDateTime resolvedAt) { this.resolvedAt = resolvedAt; }
}
