package com.snovasys.trustvault.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Reset token is required")
        String token,

        @NotBlank(message = "New password is required")
        @Size(min = 12, max = 72, message = "Password must contain 12 to 72 characters")
        String newPassword
) {
}
