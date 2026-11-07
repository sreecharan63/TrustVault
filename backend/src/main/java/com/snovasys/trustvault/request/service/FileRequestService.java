package com.snovasys.trustvault.request.service;

import com.snovasys.trustvault.audit.service.AuditService;
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
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class FileRequestService {

    private final FileRequestRepository fileRequestRepository;
    private final AppUserRepository userRepository;
    private final AuditService auditService;

    public FileRequestService(
            FileRequestRepository fileRequestRepository,
            AppUserRepository userRepository,
            AuditService auditService) {
        this.fileRequestRepository = fileRequestRepository;
        this.userRepository = userRepository;
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
            ResolveFileRequest resolution,
            String adminEmail,
            String ipAddress,
            String userAgent) {

        AppUser admin = userRepository.findByEmail(adminEmail.trim().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Admin user not found"));

        if (admin.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only administrators can resolve file requests");
        }

        FileRequest request = fileRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File request not found"));

        request.setStatus(resolution.status());
        request.setAdminResponse(resolution.adminResponse() != null ? resolution.adminResponse().trim() : null);
        request.setResolvedBy(admin);
        request.setResolvedAt(OffsetDateTime.now());

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
