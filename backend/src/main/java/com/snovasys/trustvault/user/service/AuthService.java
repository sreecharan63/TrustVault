package com.snovasys.trustvault.user.service;

import com.snovasys.trustvault.security.JwtService;
import com.snovasys.trustvault.user.dto.AuthResponse;
import com.snovasys.trustvault.user.dto.LoginRequest;
import com.snovasys.trustvault.user.dto.RegisterRequest;
import com.snovasys.trustvault.user.dto.UserProfileResponse;
import com.snovasys.trustvault.user.entity.AppUser;
import com.snovasys.trustvault.user.entity.Role;
import com.snovasys.trustvault.user.repository.AppUserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
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
        user.setRole(Role.USER);
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
}
