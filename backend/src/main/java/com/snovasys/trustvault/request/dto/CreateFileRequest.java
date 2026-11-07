package com.snovasys.trustvault.request.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFileRequest(
        @NotBlank(message = "File name is required")
        @Size(max = 255, message = "File name must not exceed 255 characters")
        String fileName,

        @NotBlank(message = "Access specification is required")
        String accessSpecification,

        @NotBlank(message = "Description is required")
        String description
) {}
