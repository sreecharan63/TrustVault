package com.snovasys.trustvault.user.controller;

import com.snovasys.trustvault.user.dto.AuthResponse;
import com.snovasys.trustvault.user.dto.ForgotPasswordRequest;
import com.snovasys.trustvault.user.dto.LoginRequest;
import com.snovasys.trustvault.user.dto.RegisterRequest;
import com.snovasys.trustvault.user.dto.ResetPasswordRequest;
import com.snovasys.trustvault.user.dto.UserProfileResponse;
import com.snovasys.trustvault.user.service.AuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request) {

        AuthResponse response = authService.register(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        AuthResponse response = authService.login(request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest servletRequest) {

        String ipAddress = servletRequest.getRemoteAddr();
        String userAgent = servletRequest.getHeader("User-Agent");
        Map<String, String> response = authService.forgotPassword(request.email(), ipAddress, userAgent);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest servletRequest) {

        String ipAddress = servletRequest.getRemoteAddr();
        String userAgent = servletRequest.getHeader("User-Agent");
        Map<String, String> response = authService.resetPassword(request.token(), request.newPassword(), ipAddress, userAgent);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<UserProfileResponse> getCurrentUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserProfileResponse response = authService.getProfile(authentication.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/users")
    public ResponseEntity<java.util.List<UserProfileResponse>> getShareableUsers(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        java.util.List<UserProfileResponse> users = authService.getShareableUsers(authentication.getName());
        return ResponseEntity.ok(users);
    }
}
