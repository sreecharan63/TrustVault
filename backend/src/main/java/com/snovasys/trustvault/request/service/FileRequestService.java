package com.snovasys.trustvault.request.service;

import com.snovasys.trustvault.audit.service.AuditService;
import com.snovasys.trustvault.document.dto.DocumentResponse;
import com.snovasys.trustvault.document.entity.Document;
import com.snovasys.trustvault.document.repository.DocumentRepository;
import com.snovasys.trustvault.document.service.DocumentService;
import com.snovasys.trustvault.document.service.DocumentSharingService;
import com.snovasys.trustvault.request.dto.CreateFileRequest;
import com.snovasys.trustvault.request.dto.FileRequestResponse;
import com.snovasys.trustvault.request.dto.ResolveFileRequest;
import com.snovasys.trustvault.request.entity.FileRequest;
import com.snovasys.trustvault.request.repository.FileRequestRepository;
import com.snovasys.trustvault.user.entity.AppUser;
import com.snovasys.trustvault.user.entity.Role;
import com.snovasys.trustvault.user.repository.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class FileRequestService {

    private final FileRequestRepository fileRequestRepository;
    private final AppUserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentService documentService;
    private final DocumentSharingService documentSharingService;
    private final AuditService auditService;

    public FileRequestService(
            FileRequestRepository fileRequestRepository,
            AppUserRepository userRepository,
            DocumentRepository documentRepository,
            DocumentService documentService,
            DocumentSharingService documentSharingService,
            AuditService auditService) {
        this.fileRequestRepository = fileRequestRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.documentService = documentService;
        this.documentSharingService = documentSharingService;
        this.auditService = auditService;
    }

    @Transactional
    public FileRequestResponse createRequest(
            CreateFileRequest requestDto,
            String userEmail,
            String ipAddress,
            String userAgent) {

        AppUser user = userRepository.findByEmail(userEmail.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        FileRequest fileRequest = new FileRequest(
                user,
                requestDto.fileName().trim(),
                requestDto.accessSpecification().trim(),
                requestDto.description().trim()
        );

        FileRequest saved = fileRequestRepository.save(fileRequest);

        auditService.recordSuccess(
                user.getId(),
                user.getEmail(),
                "FILE_REQUEST_SUBMIT",
                "DOCUMENT",
                saved.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of(
                        "fileName", saved.getFileName(),
                        "accessSpecification", saved.getAccessSpecification()
                )
        );

        return FileRequestResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<FileRequestResponse> getMyRequests(String userEmail) {
        AppUser user = userRepository.findByEmail(userEmail.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        return fileRequestRepository.findAllByRequesterId(user.getId())
                .stream()
                .map(FileRequestResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FileRequestResponse> getAllRequests() {
        return fileRequestRepository.findAllWithUsers()
                .stream()
                .map(FileRequestResponse::from)
                .toList();
    }

    @Transactional
    public FileRequestResponse resolveRequest(
            UUID requestId,
            String status,
            String adminResponse,
            MultipartFile file,
            UUID existingDocumentId,
            String adminEmail,
            String ipAddress,
            String userAgent) throws IOException {

        AppUser admin = userRepository.findByEmail(adminEmail.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Admin user not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only administrators can resolve file requests");
        }

        FileRequest request = fileRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File request not found"));

        request.setStatus(status);
        request.setAdminResponse(adminResponse != null ? adminResponse.trim() : null);
        request.setResolvedBy(admin);
        request.setResolvedAt(OffsetDateTime.now());

        // If approved, attach file if provided
        if ("APPROVED".equalsIgnoreCase(status)) {
            Document fulfilledDoc = null;

            if (file != null && !file.isEmpty()) {
                // Upload file as an admin document
                DocumentResponse uploadedDoc = documentService.upload(
                        file,
                        "Fulfilled file request: " + request.getFileName(),
                        "Requests",
                        "fulfilled-request",
                        admin.getEmail(),
                        ipAddress,
                        userAgent
                );

                fulfilledDoc = documentRepository.findById(uploadedDoc.id()).orElse(null);
            } else if (existingDocumentId != null) {
                fulfilledDoc = documentRepository.findById(existingDocumentId).orElse(null);
            }

            if (fulfilledDoc != null) {
                request.setFulfilledDocument(fulfilledDoc);

                // Share document with the requester matching requested permissions
                boolean canEdit = "EDIT".equalsIgnoreCase(request.getAccessSpecification())
                        || "FULL_ACCESS".equalsIgnoreCase(request.getAccessSpecification());

                try {
                    documentSharingService.shareDocument(
                            fulfilledDoc.getId(),
                            request.getRequester().getEmail(),
                            true,       // canRead
                            canEdit,    // canEdit
                            true,       // canDownload
                            admin.getEmail(),
                            ipAddress,
                            userAgent
                    );
                } catch (ResponseStatusException ex) {
                    // If already shared or conflict, that's acceptable
                }
            }
        }

        FileRequest saved = fileRequestRepository.save(request);

        auditService.recordSuccess(
                admin.getId(),
                admin.getEmail(),
                "FILE_REQUEST_RESOLVE",
                "DOCUMENT",
                saved.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of(
                        "status", saved.getStatus(),
                        "fileName", saved.getFileName(),
                        "requesterEmail", saved.getRequester().getEmail()
                )
        );

        return FileRequestResponse.from(saved);
    }
}
