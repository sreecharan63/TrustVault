package com.snovasys.trustvault.user.service;

import com.snovasys.trustvault.audit.service.AuditService;
import com.snovasys.trustvault.security.JwtService;
import com.snovasys.trustvault.user.dto.AuthResponse;
import com.snovasys.trustvault.user.dto.LoginRequest;
import com.snovasys.trustvault.user.dto.RegisterRequest;
import com.snovasys.trustvault.user.dto.UserProfileResponse;
import com.snovasys.trustvault.user.entity.AppUser;
import com.snovasys.trustvault.user.entity.PasswordResetToken;
import com.snovasys.trustvault.user.entity.Role;
import com.snovasys.trustvault.user.repository.AppUserRepository;
import com.snovasys.trustvault.user.repository.PasswordResetTokenRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final AuditService auditService;

    public AuthService(
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            PasswordResetTokenRepository passwordResetTokenRepository,
            AuditService auditService) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.auditService = auditService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {

        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already registered"
            );
        }

        AppUser user = new AppUser();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPasswordHash(
                passwordEncoder.encode(request.password())
        );
        Role assignedRole = Role.DOCUMENT_OWNER;
        if (request.role() != null && !request.role().isBlank()) {
            String requested = request.role().trim().toUpperCase();
            if ("VIEWER".equals(requested)) {
                assignedRole = Role.VIEWER;
            } else if ("ADMIN".equals(requested)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role cannot be self-assigned during registration");
            }
        }
        user.setRole(assignedRole);
        user.setEnabled(true);

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());

        return new AuthResponse(
                token,
                "Bearer",
                jwtService.getExpirationMs()
        );
    }

    public AuthResponse login(LoginRequest request) {

        String email = request.email().trim().toLowerCase();

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        email,
                        request.password()
                )
        );

        String token = jwtService.generateToken(email);

        return new AuthResponse(
                token,
                "Bearer",
                jwtService.getExpirationMs()
        );
    }

    @Transactional(readOnly = true)
    public UserProfileResponse getProfile(String email) {
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "User is not authenticated"
            );
        }

        AppUser user = userRepository.findByEmail(email.trim().toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Authenticated user not found"
                ));

        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name()
        );
    }

    @Transactional(readOnly = true)
    public java.util.List<UserProfileResponse> getShareableUsers(String currentEmail) {
        String normalized = currentEmail != null ? currentEmail.trim().toLowerCase() : "";
        return userRepository.findAll().stream()
                .filter(u -> u.isEnabled() && !u.getEmail().equalsIgnoreCase(normalized))
                .map(u -> new UserProfileResponse(
                        u.getId(),
                        u.getEmail(),
                        u.getFullName(),
                        u.getRole().name()
                ))
                .sorted((a, b) -> a.fullName().compareToIgnoreCase(b.fullName()))
                .toList();
    }

    @Transactional
    public Map<String, String> forgotPassword(String emailInput, String ipAddress, String userAgent) {
        String email = emailInput != null ? emailInput.trim().toLowerCase() : "";
        Optional<AppUser> userOpt = userRepository.findByEmail(email);

        if (userOpt.isEmpty() || !userOpt.get().isEnabled()) {
            return Map.of("message", "If your email is registered, a password reset token has been generated.");
        }

        AppUser user = userOpt.get();
        String rawToken = UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setTokenHash(tokenHash);
        resetToken.setExpiresAt(OffsetDateTime.now().plusMinutes(15));
        passwordResetTokenRepository.save(resetToken);

        auditService.recordSuccess(
                user.getId(),
                user.getEmail(),
                "PASSWORD_RESET_REQUESTED",
                "USER",
                user.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of("expiresInMinutes", 15)
        );

        return Map.of(
                "message", "A password reset token has been generated. It is valid for 15 minutes.",
                "resetToken", rawToken
        );
    }

    @Transactional
    public Map<String, String> resetPassword(String rawToken, String newPassword, String ipAddress, String userAgent) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token is required");
        }
        if (newPassword == null || newPassword.length() < 12 || newPassword.length() > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must contain 12 to 72 characters");
        }

        String tokenHash = hashToken(rawToken.trim());
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired reset token"));

        if (resetToken.getUsedAt() != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token has already been used");
        }
        if (resetToken.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reset token has expired");
        }

        AppUser user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsedAt(OffsetDateTime.now());
        passwordResetTokenRepository.save(resetToken);

        auditService.recordSuccess(
                user.getId(),
                user.getEmail(),
                "PASSWORD_RESET_COMPLETED",
                "USER",
                user.getId(),
                "SUCCESS",
                ipAddress,
                userAgent,
                Map.of("reason", "Self-service password reset")
        );

        return Map.of("message", "Password has been successfully reset. You may now log in.");
    }

    private String hashToken(String token) {
        try {
            java.security.MessageDigest md = java.security.MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new RuntimeException("SHA-256 not supported", e);
        }
    }
}
