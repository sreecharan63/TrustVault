
package com.snovasys.trustvault.document.service;

import com.snovasys.trustvault.document.dto.DocumentResponse;
import com.snovasys.trustvault.document.entity.Document;
import com.snovasys.trustvault.document.entity.DocumentStatus;
import com.snovasys.trustvault.document.repository.DocumentRepository;
import com.snovasys.trustvault.user.entity.AppUser;
import com.snovasys.trustvault.user.repository.AppUserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Locale;

import java.nio.file.Path;
import java.util.UUID;

@Service
public class DocumentService {

    private static final long MAX_FILE_SIZE = 25L * 1024 * 1024;

    private final DocumentRepository documentRepository;
    private final AppUserRepository userRepository;
    private final FileStorageService fileStorageService;

    public DocumentService(
            DocumentRepository documentRepository,
            AppUserRepository userRepository,
            FileStorageService fileStorageService) {

        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public DocumentResponse upload(
            MultipartFile file,
            String description,
            String email) throws IOException {

        // 1. Validate the uploaded file.
        validateFile(file);

        // 2. Find the authenticated user.
        AppUser owner = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        // 3. Store the physical file.
        FileStorageService.StoredFile storedFile =
                fileStorageService.store(file);

        try {
            // 4. Create document metadata.
            Document document = new Document();

            document.setOwner(owner);
            document.setOriginalFilename(storedFile.originalFilename());
            document.setDescription(description);
            document.setContentType(storedFile.contentType());
            document.setFileSize(storedFile.fileSize());
            document.setStorageKey(storedFile.storageKey());
            document.setChecksumSha256(storedFile.checksumSha256());
            document.setCurrentVersionNumber(1);
            document.setStatus(DocumentStatus.ACTIVE);

            // 5. Save metadata in PostgreSQL.
            Document savedDocument = documentRepository.saveAndFlush(document);

            // 6. Return safe document information.
            return toResponse(savedDocument);

        } catch (RuntimeException exception) {

            // Remove the physical file if database saving fails.
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

        // Basic extension and MIME-type validation.
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

        return new DocumentResponse(
                document.getId(),
                document.getOriginalFilename(),
                document.getDescription(),
                document.getContentType(),
                document.getFileSize(),
                document.getChecksumSha256(),
                document.getCurrentVersionNumber(),
                document.getStatus().name(),
                document.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> getMyDocuments(String email) {

        // 1. Find the authenticated user.
        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        // 2. Retrieve only this user's active documents.
        List<Document> documents =
                documentRepository.findAllByOwner_IdAndStatusOrderByCreatedAtDesc(
                        user.getId(),
                        DocumentStatus.ACTIVE
                );

        // 3. Convert entities into response DTOs.
        return documents.stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DownloadFile downloadDocument(UUID documentId, String email) throws IOException {

        // 1. Find the authenticated user.
        AppUser user = userRepository.findByEmail(
                email.trim().toLowerCase(Locale.ROOT)
        ).orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                )
        );

        // 2. Find the document only if it belongs to this user.
        Document document = documentRepository
                .findByIdAndOwner_IdAndStatus(
                        documentId,
                        user.getId(),
                        DocumentStatus.ACTIVE
                )
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Document not found"
                        )
                );

        // 3. Retrieve the physical file.
        return new DownloadFile(
                fileStorageService.load(document.getStorageKey()),
                document.getOriginalFilename(),
                document.getContentType()
        );
    }
    public record DownloadFile(
            Path path,
            String originalFilename,
            String contentType
    ) {}

}
