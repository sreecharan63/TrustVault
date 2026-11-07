package com.snovasys.trustvault.request.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ResolveFileRequest(
        @NotBlank(message = "Status is required")
        @Pattern(regexp = "APPROVED|REJECTED", message = "Status must be APPROVED or REJECTED")
        String status,

        String adminResponse
) {}
