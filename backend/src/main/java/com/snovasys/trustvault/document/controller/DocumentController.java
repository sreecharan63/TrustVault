
package com.snovasys.trustvault.document.controller;

import com.snovasys.trustvault.document.dto.DocumentResponse;
import com.snovasys.trustvault.document.service.DocumentService;

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
import java.util.UUID;
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @PostMapping(
            value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<DocumentResponse> upload(
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String description,
            Authentication authentication
    ) throws IOException {

        DocumentResponse response = documentService.upload(
                file,
                description,
                authentication.getName()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }
    @GetMapping
    public ResponseEntity<List<DocumentResponse>> getMyDocuments(
            Authentication authentication) {

        List<DocumentResponse> documents =
                documentService.getMyDocuments(authentication.getName());

        return ResponseEntity.ok(documents);
    }

    @GetMapping("/{documentId}/download")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable UUID documentId,
            Authentication authentication) throws IOException {

        DocumentService.DownloadFile downloadFile =
                documentService.downloadDocument(
                        documentId,
                        authentication.getName()
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
}
