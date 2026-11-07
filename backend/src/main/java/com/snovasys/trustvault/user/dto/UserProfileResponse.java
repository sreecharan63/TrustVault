package com.snovasys.trustvault.user.dto;

import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String email,
        String fullName,
        String role
) {}
