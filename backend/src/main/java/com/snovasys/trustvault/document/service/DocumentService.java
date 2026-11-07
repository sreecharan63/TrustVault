package com.snovasys.trustvault.document.service;

import com.snovasys.trustvault.audit.dto.AuditLogResponse;
import com.snovasys.trustvault.audit.entity.AuditLog;
import com.snovasys.trustvault.audit.repository.AuditLogRepository;
import com.snovasys.trustvault.audit.service.AuditService;
import com.snovasys.trustvault.document.dto.DocumentResponse;
import com.snovasys.trustvault.document.dto.DocumentVersionResponse;
import com.snovasys.trustvault.document.entity.Document;
import com.snovasys.trustvault.document.entity.DocumentPermission;
import com.snovasys.trustvault.document.entity.DocumentStatus;
import com.snovasys.trustvault.document.entity.DocumentVersion;
import com.snovasys.trustvault.document.repository.DocumentPermissionRepository;
import com.snovasys.trustvault.document.repository.DocumentRepository;
import com.snovasys.trustvault.document.repository.DocumentVersionRepository;
import com.snovasys.trustvault.user.entity.AppUser;
import com.snovasys.trustvault.user.repository.AppUserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class DocumentService {

    private static final long MAX_FILE_SIZE = 25L * 1024 * 1024;

    private final DocumentRepository documentRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final DocumentVersionRepository versionRepository;
    private final AppUserRepository userRepository;
    private final FileStorageService fileStorageService;
    private final AuditService auditService;
    private final AuditLogRepository auditLogRepository;

    public DocumentService(
            DocumentRepository documentRepository,
            DocumentPermissionRepository permissionRepository,
            DocumentVersionRepository versionRepository,
            AppUserRepository userRepository,
            FileStorageService fileStorageService,
            AuditService auditService,
            AuditLogRepository auditLogRepository) {

        this.documentRepository = documentRepository;
        this.permissionRepository = permissionRepository;
        this.versionRepository = versionRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
        this.auditService = auditService;
        this.auditLogRepository = auditLogRepository;
    }

    // Backward-compatible overload for 5-parameter upload
    @Transactional
    public DocumentResponse upload(
            MultipartFile file,
            String description,
            String email,
            String ipAddress,
            String userAgent) throws IOException {

        return upload(file, description, null, null, email, ipAddress, userAgent);
    }

    @Transactional
    public DocumentResponse upload(
            MultipartFile file,
            String description,
            String category,
            String tags,
            String email,
            String ipAddress,
            String userAgent) throws IOException {

        validateFile(file);

        AppUser owner = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        if (owner.getRole() == com.snovasys.trustvault.user.entity.Role.VIEWER) {
            recordDenied(owner, "DOCUMENT_UPLOAD", null, "VIEWER_CANNOT_UPLOAD", ipAddress, userAgent);
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Viewers are not permitted to upload documents; requires Document Owner role"
            );
        }

        FileStorageService.StoredFile storedFile =
                fileStorageService.store(file);

        try {
            Document document = new Document();

            document.setOwner(owner);
            document.setOriginalFilename(storedFile.originalFilename());
            document.setDescription(description);
            document.setCategory(category != null ? category.trim() : null);
            document.setTags(tags != null ? tags.trim() : null);
            document.setContentType(storedFile.contentType());
            document.setFileSize(storedFile.fileSize());
            document.setStorageKey(storedFile.storageKey());
            document.setChecksumSha256(storedFile.checksumSha256());
            document.setCurrentVersionNumber(1);
            document.setStatus(DocumentStatus.ACTIVE);

            Document savedDocument = documentRepository.saveAndFlush(document);

            // Record initial version in document_versions table
            DocumentVersion initialVersion = new DocumentVersion();
            initialVersion.setDocument(savedDocument);
            initialVersion.setVersionNumber(1);
            initialVersion.setOriginalFilename(savedDocument.getOriginalFilename());
            initialVersion.setContentType(savedDocument.getContentType());
            initialVersion.setFileSize(savedDocument.getFileSize());
            initialVersion.setStorageKey(savedDocument.getStorageKey());
            initialVersion.setChecksumSha256(savedDocument.getChecksumSha256());
            initialVersion.setUploadedBy(owner);
            versionRepository.saveAndFlush(initialVersion);

            // Record successful upload.
            auditService.recordSuccess(
                    owner.getId(),
                    owner.getEmail(),
                    "DOCUMENT_UPLOAD",
                    "DOCUMENT",
                    savedDocument.getId(),
                    "SUCCESS",
                    ipAddress,
                    userAgent,
                    Map.of(
                            "filename", savedDocument.getOriginalFilename(),
                            "fileSize", savedDocument.getFileSize(),
                            "contentType", savedDocument.getContentType()
                    )
            );

            return toResponse(savedDocument, true, true, true, true);

        } catch (RuntimeException exception) {

            try {
                fileStorageService.delete(storedFile.storageKey());
            } catch (IOException cleanupException) {
                exception.addSuppressed(cleanupException);
            }

            throw exception;
        }
    }

    private void validateFile(MultipartFile file) {

        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Please select a file to upload"
            );
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.PAYLOAD_TOO_LARGE,
                    "File size cannot exceed 25 MB"
            );
        }

        String filename = file.getOriginalFilename();

        if (filename == null || filename.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid filename"
            );
        }

        String lowerFilename = filename.toLowerCase(Locale.ROOT);
        String contentType = file.getContentType();

        boolean validType =
                (lowerFilename.endsWith(".pdf")
                        && "application/pdf".equalsIgnoreCase(contentType))
                        || (lowerFilename.endsWith(".txt")
                        && "text/plain".equalsIgnoreCase(contentType))
                        || (lowerFilename.endsWith(".png")
                        && "image/png".equalsIgnoreCase(contentType))
                        || ((lowerFilename.endsWith(".jpg")
                        || lowerFilename.endsWith(".jpeg"))
                        && "image/jpeg".equalsIgnoreCase(contentType))
                        || (lowerFilename.endsWith(".doc")
                        && "application/msword".equalsIgnoreCase(contentType))
                        || (lowerFilename.endsWith(".docx")
                        && "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        .equalsIgnoreCase(contentType));

        if (!validType) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Unsupported file type. Allowed: PDF, TXT, PNG, JPG, DOC and DOCX"
            );
        }
    }

    private DocumentResponse toResponse(Document document) {
        return toResponse(document, true, true, true, true);
    }

    private DocumentResponse toResponse(
            Document document,
            boolean isOwner,
            boolean canRead,
            boolean canEdit,
            boolean canDownload) {

        return new DocumentResponse(
                document.getId(),
                document.getOriginalFilename(),
                document.getDescription(),
                document.getCategory(),
                document.getTags(),
                document.getContentType(),
                document.getFileSize(),
                document.getChecksumSha256(),
                document.getCurrentVersionNumber(),
                document.getStatus().name(),
                document.getOwner() != null ? document.getOwner().getEmail() : null,
                document.getOwner() != null ? document.getOwner().getFullName() : null,
                isOwner,
                canRead,
                canEdit,
                canDownload,
                document.getCreatedAt(),
                document.getUpdatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> getMyDocuments(String email) {
        return getMyDocuments(email, null, null);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> getMyDocuments(String email, String search, String category) {

        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        List<Document> documents =
                documentRepository.findAllByOwner_IdAndStatusOrderByCreatedAtDesc(
                        user.getId(),
                        DocumentStatus.ACTIVE
                );

        return documents.stream()
                .filter(doc -> {
                    if (category != null && !category.isBlank()) {
                        if (doc.getCategory() == null || !doc.getCategory().equalsIgnoreCase(category.trim())) {
                            return false;
                        }
                    }
                    if (search != null && !search.isBlank()) {
                        String q = search.trim().toLowerCase(Locale.ROOT);
                        boolean matchName = doc.getOriginalFilename() != null && doc.getOriginalFilename().toLowerCase(Locale.ROOT).contains(q);
                        boolean matchDesc = doc.getDescription() != null && doc.getDescription().toLowerCase(Locale.ROOT).contains(q);
                        boolean matchTags = doc.getTags() != null && doc.getTags().toLowerCase(Locale.ROOT).contains(q);
                        return matchName || matchDesc || matchTags;
                    }
                    return true;
                })
                .map(doc -> toResponse(doc, true, true, true, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> getSharedWithMe(String email) {
        return getSharedWithMe(email, null, null);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> getSharedWithMe(String email, String search, String category) {

        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        List<DocumentPermission> permissions =
                permissionRepository.findAllByGrantee_IdAndRevokedAtIsNull(
                        user.getId()
                );

        return permissions.stream()
                .filter(DocumentPermission::isCanRead)
                .map(permission -> {
                    Document doc = permission.getDocument();
                    if (doc.getStatus() != DocumentStatus.ACTIVE) {
                        return null;
                    }
                    if (category != null && !category.isBlank()) {
                        if (doc.getCategory() == null || !doc.getCategory().equalsIgnoreCase(category.trim())) {
                            return null;
                        }
                    }
                    if (search != null && !search.isBlank()) {
                        String q = search.trim().toLowerCase(Locale.ROOT);
                        boolean matchName = doc.getOriginalFilename() != null && doc.getOriginalFilename().toLowerCase(Locale.ROOT).contains(q);
                        boolean matchDesc = doc.getDescription() != null && doc.getDescription().toLowerCase(Locale.ROOT).contains(q);
                        boolean matchTags = doc.getTags() != null && doc.getTags().toLowerCase(Locale.ROOT).contains(q);
                        if (!matchName && !matchDesc && !matchTags) {
                            return null;
                        }
                    }
                    return toResponse(
                            doc,
                            false,
                            permission.isCanRead(),
                            permission.isCanEdit(),
                            permission.isCanDownload()
                    );
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> getSharedByMe(String email) {
        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        List<DocumentPermission> activePermissions =
                permissionRepository.findAllByGrantedBy_IdAndRevokedAtIsNull(user.getId());

        Set<UUID> seenDocIds = new HashSet<>();
        List<DocumentResponse> responses = new ArrayList<>();

        for (DocumentPermission p : activePermissions) {
            Document doc = p.getDocument();
            if (doc.getStatus() == DocumentStatus.ACTIVE && seenDocIds.add(doc.getId())) {
                responses.add(toResponse(doc, true, true, true, true));
            }
        }

        return responses;
    }

    @Transactional
    public DownloadFile downloadDocument(
            UUID documentId,
            String email,
            String ipAddress,
            String userAgent) throws IOException {

        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        Optional<Document> ownedDocument =
                documentRepository.findByIdAndOwner_IdAndStatus(
                        documentId,
                        user.getId(),
                        DocumentStatus.ACTIVE
                );

        Document document;

        if (ownedDocument.isPresent()) {
            document = ownedDocument.get();
        } else {
            Optional<DocumentPermission> activePermission =
                    permissionRepository
                            .findByDocument_IdAndGrantee_IdAndRevokedAtIsNull(
                                    documentId,
                                    user.getId()
                            );

            if (activePermission.isEmpty()) {
                recordDenied(
                        user, "DOCUMENT_DOWNLOAD", documentId, "NO_ACTIVE_PERMISSION", ipAddress, userAgent
                );
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Document not found"
                );
            }

            DocumentPermission permission = activePermission.get();
            document = permission.getDocument();

            if (document.getStatus() != DocumentStatus.ACTIVE) {
                recordDenied(
                        user, "DOCUMENT_DOWNLOAD", documentId, "DOCUMENT_NOT_ACTIVE", ipAddress, userAgent
                );
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Document not found"
                );
            }

            if (!permission.isCanDownload()) {
                recordDenied(
                        user, "DOCUMENT_DOWNLOAD", documentId, "DOWNLOAD_NOT_ALLOWED", ipAddress, userAgent
                );
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You do not have permission to download this document"
                );
            }
        }

        Path filePath = fileStorageService.load(document.getStorageKey());

        // Record successful document download.
        auditService.recordSuccess(
                user.getId(),
                user.getEmail(),
                "DOCUMENT_DOWNLOAD",
                "DOCUMENT",
                document.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of(
                        "filename", document.getOriginalFilename(),
                        "fileSize", document.getFileSize(),
                        "contentType", document.getContentType()
                )
        );

        return new DownloadFile(
                filePath,
                document.getOriginalFilename(),
                document.getContentType()
        );
    }

    @Transactional(readOnly = true)
    public DownloadFile previewDocument(
            UUID documentId,
            String email,
            String ipAddress,
            String userAgent) throws IOException {

        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        Optional<Document> ownedDocument =
                documentRepository.findByIdAndOwner_IdAndStatus(
                        documentId,
                        user.getId(),
                        DocumentStatus.ACTIVE
                );

        Document document;

        if (ownedDocument.isPresent()) {
            document = ownedDocument.get();
        } else {
            Optional<DocumentPermission> activePermission =
                    permissionRepository
                            .findByDocument_IdAndGrantee_IdAndRevokedAtIsNull(
                                    documentId,
                                    user.getId()
                            );

            if (activePermission.isEmpty() || !activePermission.get().isCanRead()) {
                recordDenied(
                        user, "DOCUMENT_PREVIEW", documentId, "NO_READ_PERMISSION", ipAddress, userAgent
                );
                throw new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You do not have permission to preview this document"
                );
            }

            document = activePermission.get().getDocument();
            if (document.getStatus() != DocumentStatus.ACTIVE) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Document not found"
                );
            }
        }

        Path filePath = fileStorageService.load(document.getStorageKey());

        return new DownloadFile(
                filePath,
                document.getOriginalFilename(),
                document.getContentType()
        );
    }

    @Transactional
    public DocumentResponse editDocument(
            UUID documentId,
            MultipartFile newFile,
            String description,
            String category,
            String tags,
            String email,
            String ipAddress,
            String userAgent) throws IOException {

        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        Document document = documentRepository.findByIdAndStatus(documentId, DocumentStatus.ACTIVE)
                .orElseThrow(() -> {
                    recordDenied(user, "DOCUMENT_UPDATE", documentId, "DOCUMENT_NOT_FOUND", ipAddress, userAgent);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
                });

        boolean isOwner = document.getOwner().getId().equals(user.getId());
        boolean canEdit = isOwner;

        if (!isOwner) {
            Optional<DocumentPermission> permissionOpt = permissionRepository
                    .findByDocument_IdAndGrantee_IdAndRevokedAtIsNull(documentId, user.getId());
            canEdit = permissionOpt.isPresent() && permissionOpt.get().isCanEdit();
        }

        if (!canEdit) {
            recordDenied(user, "DOCUMENT_UPDATE", documentId, "UNAUTHORIZED_EDIT", ipAddress, userAgent);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to edit this document");
        }

        // If a new file is uploaded, snapshot the current version before updating!
        if (newFile != null && !newFile.isEmpty()) {
            validateFile(newFile);

            // Snapshot the previous/current version into document_versions if not already stored
            Optional<DocumentVersion> existingVersion = versionRepository
                    .findByDocument_IdAndVersionNumber(document.getId(), document.getCurrentVersionNumber());

            if (existingVersion.isEmpty()) {
                DocumentVersion previousVersion = new DocumentVersion();
                previousVersion.setDocument(document);
                previousVersion.setVersionNumber(document.getCurrentVersionNumber());
                previousVersion.setOriginalFilename(document.getOriginalFilename());
                previousVersion.setContentType(document.getContentType());
                previousVersion.setFileSize(document.getFileSize());
                previousVersion.setStorageKey(document.getStorageKey());
                previousVersion.setChecksumSha256(document.getChecksumSha256());
                previousVersion.setUploadedBy(document.getOwner());
                versionRepository.saveAndFlush(previousVersion);
            }

            // Store new file
            FileStorageService.StoredFile storedFile = fileStorageService.store(newFile);

            int nextVersion = document.getCurrentVersionNumber() + 1;
            document.setOriginalFilename(storedFile.originalFilename());
            document.setContentType(storedFile.contentType());
            document.setFileSize(storedFile.fileSize());
            document.setStorageKey(storedFile.storageKey());
            document.setChecksumSha256(storedFile.checksumSha256());
            document.setCurrentVersionNumber(nextVersion);

            // Also register this new version in document_versions
            DocumentVersion newVersionEntry = new DocumentVersion();
            newVersionEntry.setDocument(document);
            newVersionEntry.setVersionNumber(nextVersion);
            newVersionEntry.setOriginalFilename(storedFile.originalFilename());
            newVersionEntry.setContentType(storedFile.contentType());
            newVersionEntry.setFileSize(storedFile.fileSize());
            newVersionEntry.setStorageKey(storedFile.storageKey());
            newVersionEntry.setChecksumSha256(storedFile.checksumSha256());
            newVersionEntry.setUploadedBy(user);
            versionRepository.saveAndFlush(newVersionEntry);

            auditService.recordSuccess(
                    user.getId(),
                    user.getEmail(),
                    "VERSION_CREATE",
                    "DOCUMENT",
                    document.getId(),
                    "SUCCESS",
                    ipAddress,
                    userAgent,
                    Map.of(
                            "versionNumber", nextVersion,
                            "filename", storedFile.originalFilename(),
                            "fileSize", storedFile.fileSize()
                    )
            );
        }

        if (description != null) {
            document.setDescription(description.trim());
        }
        if (category != null) {
            document.setCategory(category.trim());
        }
        if (tags != null) {
            document.setTags(tags.trim());
        }

        document.setUpdatedAt(OffsetDateTime.now());
        Document updatedDocument = documentRepository.saveAndFlush(document);

        auditService.recordSuccess(
                user.getId(),
                user.getEmail(),
                "DOCUMENT_UPDATE",
                "DOCUMENT",
                updatedDocument.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of(
                        "filename", updatedDocument.getOriginalFilename(),
                        "currentVersion", updatedDocument.getCurrentVersionNumber(),
                        "fileSize", updatedDocument.getFileSize()
                )
        );

        return toResponse(updatedDocument, isOwner, true, canEdit, isOwner);
    }

    @Transactional
    public void deleteDocument(
            UUID documentId,
            String email,
            String ipAddress,
            String userAgent) {

        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        Document document = documentRepository.findByIdAndStatus(documentId, DocumentStatus.ACTIVE)
                .orElseThrow(() -> {
                    recordDenied(user, "DOCUMENT_DELETE", documentId, "DOCUMENT_NOT_FOUND", ipAddress, userAgent);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
                });

        if (!document.getOwner().getId().equals(user.getId())) {
            recordDenied(user, "DOCUMENT_DELETE", documentId, "NOT_DOCUMENT_OWNER", ipAddress, userAgent);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only document owners can delete documents");
        }

        document.setStatus(DocumentStatus.DELETED);
        document.setDeletedAt(OffsetDateTime.now());
        documentRepository.saveAndFlush(document);

        auditService.recordSuccess(
                user.getId(),
                user.getEmail(),
                "DOCUMENT_DELETE",
                "DOCUMENT",
                document.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of(
                        "filename", document.getOriginalFilename(),
                        "deletedAt", document.getDeletedAt().toString()
                )
        );
    }

    @Transactional(readOnly = true)
    public List<DocumentVersionResponse> getDocumentVersions(
            UUID documentId,
            String email) {

        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        Document document = documentRepository.findByIdAndStatus(documentId, DocumentStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        boolean isOwner = document.getOwner().getId().equals(user.getId());
        boolean canRead = isOwner;

        if (!isOwner) {
            Optional<DocumentPermission> permissionOpt = permissionRepository
                    .findByDocument_IdAndGrantee_IdAndRevokedAtIsNull(documentId, user.getId());
            canRead = permissionOpt.isPresent() && permissionOpt.get().isCanRead();
        }

        if (!canRead) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to view versions");
        }

        List<DocumentVersion> versions = versionRepository.findAllByDocument_IdOrderByVersionNumberDesc(documentId);

        // If no versions exist yet in DB, synthesize from current document
        if (versions.isEmpty()) {
            return List.of(new DocumentVersionResponse(
                    UUID.randomUUID(),
                    document.getId(),
                    document.getCurrentVersionNumber(),
                    document.getOriginalFilename(),
                    document.getContentType(),
                    document.getFileSize(),
                    document.getChecksumSha256(),
                    document.getOwner().getEmail(),
                    document.getOwner().getFullName(),
                    document.getCreatedAt()
            ));
        }

        return versions.stream()
                .map(DocumentVersionResponse::from)
                .toList();
    }

    @Transactional
    public DownloadFile downloadVersion(
            UUID documentId,
            int versionNumber,
            String email,
            String ipAddress,
            String userAgent) throws IOException {

        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        Document document = documentRepository.findByIdAndStatus(documentId, DocumentStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        boolean isOwner = document.getOwner().getId().equals(user.getId());
        boolean canDownload = isOwner;

        if (!isOwner) {
            Optional<DocumentPermission> permissionOpt = permissionRepository
                    .findByDocument_IdAndGrantee_IdAndRevokedAtIsNull(documentId, user.getId());
            canDownload = permissionOpt.isPresent() && permissionOpt.get().isCanDownload();
        }

        if (!canDownload) {
            recordDenied(user, "DOCUMENT_DOWNLOAD", documentId, "VERSION_DOWNLOAD_NOT_ALLOWED", ipAddress, userAgent);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to download versions");
        }

        DocumentVersion version = versionRepository.findByDocument_IdAndVersionNumber(documentId, versionNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document version not found"));

        Path filePath = fileStorageService.load(version.getStorageKey());

        auditService.recordSuccess(
                user.getId(),
                user.getEmail(),
                "DOCUMENT_DOWNLOAD",
                "DOCUMENT",
                document.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of(
                        "versionNumber", version.getVersionNumber(),
                        "filename", version.getOriginalFilename(),
                        "fileSize", version.getFileSize()
                )
        );

        return new DownloadFile(
                filePath,
                version.getOriginalFilename(),
                version.getContentType()
        );
    }

    @Transactional
    public DocumentResponse restoreVersion(
            UUID documentId,
            int versionNumber,
            String email,
            String ipAddress,
            String userAgent) {

        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        Document document = documentRepository.findByIdAndStatus(documentId, DocumentStatus.ACTIVE)
                .orElseThrow(() -> {
                    recordDenied(user, "VERSION_RESTORE", documentId, "DOCUMENT_NOT_FOUND", ipAddress, userAgent);
                    return new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
                });

        boolean isOwner = document.getOwner().getId().equals(user.getId());
        boolean canEdit = isOwner;

        if (!isOwner) {
            Optional<DocumentPermission> permissionOpt = permissionRepository
                    .findByDocument_IdAndGrantee_IdAndRevokedAtIsNull(documentId, user.getId());
            canEdit = permissionOpt.isPresent() && permissionOpt.get().isCanEdit();
        }

        if (!canEdit) {
            recordDenied(user, "VERSION_RESTORE", documentId, "UNAUTHORIZED_RESTORE", ipAddress, userAgent);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You do not have permission to restore versions");
        }

        DocumentVersion targetVersion = versionRepository.findByDocument_IdAndVersionNumber(documentId, versionNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Target version not found"));

        // Snapshot current state before restoring
        Optional<DocumentVersion> currentSnapshot = versionRepository
                .findByDocument_IdAndVersionNumber(document.getId(), document.getCurrentVersionNumber());

        if (currentSnapshot.isEmpty()) {
            DocumentVersion snapshot = new DocumentVersion();
            snapshot.setDocument(document);
            snapshot.setVersionNumber(document.getCurrentVersionNumber());
            snapshot.setOriginalFilename(document.getOriginalFilename());
            snapshot.setContentType(document.getContentType());
            snapshot.setFileSize(document.getFileSize());
            snapshot.setStorageKey(document.getStorageKey());
            snapshot.setChecksumSha256(document.getChecksumSha256());
            snapshot.setUploadedBy(user);
            versionRepository.saveAndFlush(snapshot);
        }

        // Duplicate the storage file to give the restored version its own unique storage_key
        String restoredStorageKey;
        try {
            restoredStorageKey = fileStorageService.duplicate(targetVersion.getStorageKey());
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to duplicate version file for restore", ex);
        }

        int newVersionNumber = document.getCurrentVersionNumber() + 1;
        document.setOriginalFilename(targetVersion.getOriginalFilename());
        document.setContentType(targetVersion.getContentType());
        document.setFileSize(targetVersion.getFileSize());
        document.setStorageKey(restoredStorageKey);
        document.setChecksumSha256(targetVersion.getChecksumSha256());
        document.setCurrentVersionNumber(newVersionNumber);
        document.setUpdatedAt(OffsetDateTime.now());

        // Create new version record representing the restored state
        DocumentVersion restoredVersionEntry = new DocumentVersion();
        restoredVersionEntry.setDocument(document);
        restoredVersionEntry.setVersionNumber(newVersionNumber);
        restoredVersionEntry.setOriginalFilename(targetVersion.getOriginalFilename());
        restoredVersionEntry.setContentType(targetVersion.getContentType());
        restoredVersionEntry.setFileSize(targetVersion.getFileSize());
        restoredVersionEntry.setStorageKey(restoredStorageKey);
        restoredVersionEntry.setChecksumSha256(targetVersion.getChecksumSha256());
        restoredVersionEntry.setUploadedBy(user);
        versionRepository.saveAndFlush(restoredVersionEntry);

        Document savedDoc = documentRepository.saveAndFlush(document);

        auditService.recordSuccess(
                user.getId(),
                user.getEmail(),
                "VERSION_RESTORE",
                "DOCUMENT",
                savedDoc.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of(
                        "restoredFromVersion", versionNumber,
                        "newVersionNumber", newVersionNumber,
                        "filename", savedDoc.getOriginalFilename()
                )
        );

        return toResponse(savedDoc, isOwner, true, canEdit, isOwner);
    }

    @Transactional(readOnly = true)
    public List<AuditLogResponse> getDocumentActivity(UUID documentId, String email) {
        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        if (!document.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the document owner can view activity history");
        }

        List<AuditLog> logs = auditLogRepository.findAllByResourceIdOrderByCreatedAtDesc(documentId);
        return logs.stream().map(AuditLogResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUserDashboardStats(String email) {
        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        long myDocumentsCount = documentRepository.countByOwner_IdAndStatus(user.getId(), DocumentStatus.ACTIVE);

        List<DocumentPermission> sharedWithMe = permissionRepository.findAllByGrantee_IdAndRevokedAtIsNull(user.getId());
        long sharedWithMeCount = sharedWithMe.stream()
                .filter(p -> p.isCanRead() && p.getDocument().getStatus() == DocumentStatus.ACTIVE)
                .count();

        List<DocumentPermission> sharedByMe = permissionRepository.findAllByGrantedBy_IdAndRevokedAtIsNull(user.getId());
        long sharedByMeCount = sharedByMe.stream()
                .filter(p -> p.getDocument().getStatus() == DocumentStatus.ACTIVE)
                .map(p -> p.getDocument().getId())
                .distinct()
                .count();

        List<DocumentResponse> recentDocs = getMyDocuments(email, null, null).stream().limit(5).toList();
        List<String> categories = documentRepository.findDistinctCategoriesByOwner(user.getId(), DocumentStatus.ACTIVE);

        return Map.of(
                "totalDocuments", myDocumentsCount,
                "sharedWithMeCount", sharedWithMeCount,
                "sharedByMeCount", sharedByMeCount,
                "categories", categories,
                "recentDocuments", recentDocs
        );
    }

    private void recordDenied(
            AppUser user,
            String eventType,
            UUID documentId,
            String reason,
            String ipAddress,
            String userAgent) {

        auditService.recordDenied(
                user.getId(),
                user.getEmail(),
                eventType,
                "DOCUMENT",
                documentId,
                "DENIED",
                ipAddress,
                userAgent,
                Map.of("reason", reason)
        );
    }

    public record DownloadFile(
            Path path,
            String originalFilename,
            String contentType
    ) {}
}
