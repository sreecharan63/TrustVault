package com.snovasys.trustvault.request.controller;

import com.snovasys.trustvault.request.dto.CreateFileRequest;
import com.snovasys.trustvault.request.dto.FileRequestResponse;
import com.snovasys.trustvault.request.dto.ResolveFileRequest;
import com.snovasys.trustvault.request.service.FileRequestService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping({"/api/requests", "/api/requests/"})
public class FileRequestController {

    private final FileRequestService fileRequestService;

    public FileRequestController(FileRequestService fileRequestService) {
        this.fileRequestService = fileRequestService;
    }

    @PostMapping({"", "/"})
    public ResponseEntity<FileRequestResponse> createRequest(
            @Valid @RequestBody CreateFileRequest requestDto,
            Authentication authentication,
            HttpServletRequest request) {

        FileRequestResponse response = fileRequestService.createRequest(
                requestDto,
                authentication.getName(),
                request.getRemoteAddr(),
                request.getHeader(HttpHeaders.USER_AGENT)
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping({"/my", "/my/"})
    public ResponseEntity<List<FileRequestResponse>> getMyRequests(Authentication authentication) {
        List<FileRequestResponse> responses = fileRequestService.getMyRequests(authentication.getName());
        return ResponseEntity.ok(responses);
    }

    @GetMapping({"", "/"})
    public ResponseEntity<List<FileRequestResponse>> getAllRequests(Authentication authentication) {
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        if (!isAdmin) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        List<FileRequestResponse> responses = fileRequestService.getAllRequests();
        return ResponseEntity.ok(responses);
    }

    @PutMapping({"/{id}/resolve", "/{id}/resolve/"})
    public ResponseEntity<FileRequestResponse> resolveRequest(
            @PathVariable UUID id,
            @Valid @RequestBody ResolveFileRequest resolution,
            Authentication authentication,
            HttpServletRequest request) {

        FileRequestResponse response = fileRequestService.resolveRequest(
                id,
                resolution,
                authentication.getName(),
                request.getRemoteAddr(),
                request.getHeader(HttpHeaders.USER_AGENT)
        );

        return ResponseEntity.ok(response);
    }
}
