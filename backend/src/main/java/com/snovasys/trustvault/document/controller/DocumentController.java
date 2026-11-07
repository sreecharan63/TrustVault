package com.snovasys.trustvault.document.controller;

import com.snovasys.trustvault.audit.dto.AuditLogResponse;
import com.snovasys.trustvault.document.dto.DocumentResponse;
import com.snovasys.trustvault.document.dto.DocumentShareRequest;
import com.snovasys.trustvault.document.dto.DocumentShareResponse;
import com.snovasys.trustvault.document.dto.DocumentVersionResponse;
import com.snovasys.trustvault.document.service.DocumentService;
import com.snovasys.trustvault.document.service.DocumentSharingService;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final DocumentSharingService documentSharingService;

    public DocumentController(
            DocumentService documentService,
            DocumentSharingService documentSharingService) {

        this.documentService = documentService;
        this.documentSharingService = documentSharingService;
    }

    @PostMapping(
            value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<DocumentResponse> upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tags,
            Authentication authentication,
            HttpServletRequest request
    ) throws IOException {

        DocumentResponse response = documentService.upload(
                file,
                description,
                category,
                tags,
                authentication.getName(),
                request.getRemoteAddr(),
                request.getHeader(HttpHeaders.USER_AGENT)
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> getMyDocuments(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            Authentication authentication) {

        List<DocumentResponse> documents =
                documentService.getMyDocuments(authentication.getName(), search, category);

        return ResponseEntity.ok(documents);
    }

    @GetMapping("/shared-with-me")
    public ResponseEntity<List<DocumentResponse>> getSharedWithMe(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            Authentication authentication) {

        List<DocumentResponse> documents =
                documentService.getSharedWithMe(authentication.getName(), search, category);

        return ResponseEntity.ok(documents);
    }

    @GetMapping("/shared-by-me")
    public ResponseEntity<List<DocumentResponse>> getSharedByMe(
            Authentication authentication) {

        List<DocumentResponse> documents =
                documentService.getSharedByMe(authentication.getName());

        return ResponseEntity.ok(documents);
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<Map<String, Object>> getDashboardStats(
            Authentication authentication) {

        Map<String, Object> stats =
                documentService.getUserDashboardStats(authentication.getName());

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable UUID documentId,
            Authentication authentication,
            HttpServletRequest request
    ) throws IOException {

        DocumentService.DownloadFile downloadFile =
                documentService.downloadDocument(
                        documentId,
                        authentication.getName(),
                        request.getRemoteAddr(),
                        request.getHeader(HttpHeaders.USER_AGENT)
                );

        Resource resource = new UrlResource(
                downloadFile.path().toUri()
        );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(downloadFile.contentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + downloadFile.originalFilename() + "\""
                )
                .body(resource);
    }

    @GetMapping("/{documentId}/preview")
    public ResponseEntity<Resource> previewDocument(
            @PathVariable UUID documentId,
            Authentication authentication,
            HttpServletRequest request
    ) throws IOException {

        DocumentService.DownloadFile previewFile =
                documentService.previewDocument(
                        documentId,
                        authentication.getName(),
                        request.getRemoteAddr(),
                        request.getHeader(HttpHeaders.USER_AGENT)
                );

        Resource resource = new UrlResource(
                previewFile.path().toUri()
        );

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(previewFile.contentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + previewFile.originalFilename() + "\""
                )
                .body(resource);
    }

    @PutMapping(
            value = "/{documentId}",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<DocumentResponse> editDocument(
            @PathVariable UUID documentId,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String tags,
            Authentication authentication,
            HttpServletRequest request
    ) throws IOException {

        DocumentResponse response = documentService.editDocument(
                documentId,
                file,
                description,
                category,
                tags,
                authentication.getName(),
                request.getRemoteAddr(),
                request.getHeader(HttpHeaders.USER_AGENT)
        );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable UUID documentId,
            Authentication authentication,
            HttpServletRequest request) {

        documentService.deleteDocument(
                documentId,
                authentication.getName(),
                request.getRemoteAddr(),
                request.getHeader(HttpHeaders.USER_AGENT)
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentId}/versions")
    public ResponseEntity<List<DocumentVersionResponse>> getDocumentVersions(
            @PathVariable UUID documentId,
            Authentication authentication) {

        List<DocumentVersionResponse> versions =
                documentService.getDocumentVersions(documentId, authentication.getName());

        return ResponseEntity.ok(versions);
    }

    @GetMapping("/{documentId}/versions/{versionNumber}/download")
    public ResponseEntity<Resource> downloadVersion(
            @PathVariable UUID documentId,
            @PathVariable int versionNumber,
            Authentication authentication,
            HttpServletRequest request
    ) throws IOException {

        DocumentService.DownloadFile downloadFile =
                documentService.downloadVersion(
                        documentId,
                        versionNumber,
                        authentication.getName(),
                        request.getRemoteAddr(),
                        request.getHeader(HttpHeaders.USER_AGENT)
                );

        Resource resource = new UrlResource(downloadFile.path().toUri());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(downloadFile.contentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + downloadFile.originalFilename() + "\""
                )
                .body(resource);
    }

    @PostMapping("/{documentId}/versions/{versionNumber}/restore")
    public ResponseEntity<DocumentResponse> restoreVersion(
            @PathVariable UUID documentId,
            @PathVariable int versionNumber,
            Authentication authentication,
            HttpServletRequest request) {

        DocumentResponse response = documentService.restoreVersion(
                documentId,
                versionNumber,
                authentication.getName(),
                request.getRemoteAddr(),
                request.getHeader(HttpHeaders.USER_AGENT)
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{documentId}/share")
    public ResponseEntity<DocumentShareResponse> shareDocument(
            @PathVariable UUID documentId,
            @RequestBody DocumentShareRequest requestBody,
            Authentication authentication,
            HttpServletRequest request
    ) {

        DocumentShareResponse response =
                documentSharingService.shareDocument(
                        documentId,
                        requestBody.recipientEmail(),
                        requestBody.canRead(),
                        requestBody.canEdit(),
                        requestBody.canDownload(),
                        authentication.getName(),
                        request.getRemoteAddr(),
                        request.getHeader(HttpHeaders.USER_AGENT)
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PutMapping("/{documentId}/share")
    public ResponseEntity<DocumentShareResponse> updateSharing(
            @PathVariable UUID documentId,
            @RequestBody DocumentShareRequest requestBody,
            Authentication authentication,
            HttpServletRequest request) {

        DocumentShareResponse response =
                documentSharingService.updateSharing(
                        documentId,
                        requestBody.recipientEmail(),
                        requestBody.canRead(),
                        requestBody.canEdit(),
                        requestBody.canDownload(),
                        authentication.getName(),
                        request.getRemoteAddr(),
                        request.getHeader(HttpHeaders.USER_AGENT)
                );

        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{documentId}/share")
    public ResponseEntity<Void> revokeSharing(
            @PathVariable UUID documentId,
            @RequestParam String recipientEmail,
            Authentication authentication,
            HttpServletRequest request) {

        documentSharingService.revokeSharing(
                documentId,
                recipientEmail,
                authentication.getName(),
                request.getRemoteAddr(),
                request.getHeader(HttpHeaders.USER_AGENT)
        );

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{documentId}/permissions")
    public ResponseEntity<List<DocumentShareResponse>> getDocumentPermissions(
            @PathVariable UUID documentId,
            Authentication authentication) {

        List<DocumentShareResponse> permissions =
                documentSharingService.getDocumentPermissions(
                        documentId,
                        authentication.getName()
                );

        return ResponseEntity.ok(permissions);
    }

    @GetMapping("/{documentId}/activity")
    public ResponseEntity<List<AuditLogResponse>> getDocumentActivity(
            @PathVariable UUID documentId,
            Authentication authentication) {

        List<AuditLogResponse> logs =
                documentService.getDocumentActivity(documentId, authentication.getName());

        return ResponseEntity.ok(logs);
    }
}
