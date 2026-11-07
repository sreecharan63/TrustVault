package com.snovasys.trustvault.document.entity;

import com.snovasys.trustvault.user.entity.AppUser;
import jakarta.persistence.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_permissions")
public class DocumentPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grantee_user_id", nullable = false)
    private AppUser grantee;

    @Column(name = "can_read", nullable = false)
    private boolean canRead = true;

    @Column(name = "can_edit", nullable = false)
    private boolean canEdit = false;

    @Column(name = "can_download", nullable = false)
    private boolean canDownload = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "granted_by", nullable = false)
    private AppUser grantedBy;

    @Column(name = "granted_at", nullable = false)
    private OffsetDateTime grantedAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @PrePersist
    protected void onCreate() {
        if (grantedAt == null) {
            grantedAt = OffsetDateTime.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public Document getDocument() {
        return document;
    }

    public void setDocument(Document document) {
        this.document = document;
    }

    public AppUser getGrantee() {
        return grantee;
    }

    public void setGrantee(AppUser grantee) {
        this.grantee = grantee;
    }

    public boolean isCanRead() {
        return canRead;
    }

    public void setCanRead(boolean canRead) {
        this.canRead = canRead;
    }

    public boolean isCanEdit() {
        return canEdit;
    }

    public void setCanEdit(boolean canEdit) {
        this.canEdit = canEdit;
    }

    public boolean isCanDownload() {
        return canDownload;
    }

    public void setCanDownload(boolean canDownload) {
        this.canDownload = canDownload;
    }

    public AppUser getGrantedBy() {
        return grantedBy;
    }

    public void setGrantedBy(AppUser grantedBy) {
        this.grantedBy = grantedBy;
    }

    public OffsetDateTime getGrantedAt() {
        return grantedAt;
    }

    public OffsetDateTime getRevokedAt() {
        return revokedAt;
    }

    public void setRevokedAt(OffsetDateTime revokedAt) {
        this.revokedAt = revokedAt;
    }
}
