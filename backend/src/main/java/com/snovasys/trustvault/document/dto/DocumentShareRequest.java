package com.snovasys.trustvault.document.dto;

public record DocumentShareRequest(
        String recipientEmail,
        boolean canRead,
        boolean canEdit,
        boolean canDownload
) {
    // Backward-compatible 3-arg constructor
    public DocumentShareRequest(String recipientEmail, boolean canRead, boolean canDownload) {
        this(recipientEmail, canRead, false, canDownload);
    }
}
