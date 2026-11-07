package com.snovasys.trustvault.document.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path storageDirectory;

    public FileStorageService(
            @Value("${trustvault.storage.location}") String storageLocation) {

        this.storageDirectory = Path.of(storageLocation)
                .toAbsolutePath()
                .normalize();
    }

    public StoredFile store(MultipartFile file) throws IOException {

        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store an empty file");
        }

        // Generate a random storage identifier.
        String storageKey = UUID.randomUUID().toString();

        // Resolve the generated identifier inside the storage directory.
        Path destination = resolveStoragePath(storageKey);

        // Create the storage directory if it does not exist.
        Files.createDirectories(storageDirectory);

        // Copy the uploaded file into secure storage.
        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, destination);
        }

        try {
            // Calculate SHA-256 checksum.
            String checksum = calculateChecksum(destination);

            String originalFilename = file.getOriginalFilename();

            if (originalFilename == null || originalFilename.isBlank()) {
                originalFilename = "unnamed";
            }

            String contentType = file.getContentType();

            if (contentType == null || contentType.isBlank()) {
                contentType = "application/octet-stream";
            }

            return new StoredFile(
                    storageKey,
                    originalFilename,
                    contentType,
                    Files.size(destination),
                    checksum
            );

        } catch (Exception exception) {
            // Remove the stored file if metadata processing fails.
            Files.deleteIfExists(destination);
            throw exception;
        }
    }

    public String duplicate(String sourceStorageKey) throws IOException {
        Path sourcePath = load(sourceStorageKey);
        String newStorageKey = UUID.randomUUID().toString();
        Path destination = resolveStoragePath(newStorageKey);
        Files.copy(sourcePath, destination, StandardCopyOption.REPLACE_EXISTING);
        return newStorageKey;
    }

    private String calculateChecksum(Path filePath)
            throws IOException {

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            try (InputStream inputStream = Files.newInputStream(filePath)) {

                byte[] buffer = new byte[8192];
                int bytesRead;

                while ((bytesRead = inputStream.read(buffer)) != -1) {
                    digest.update(buffer, 0, bytesRead);
                }
            }

            return HexFormat.of().formatHex(digest.digest());

        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "SHA-256 algorithm is unavailable", exception
            );
        }
    }

    private Path resolveStoragePath(String storageKey) {

        Path destination = storageDirectory
                .resolve(storageKey)
                .normalize();

        if (!destination.startsWith(storageDirectory)) {
            throw new SecurityException("Invalid storage key");
        }

        return destination;
    }

    public void delete(String storageKey) throws IOException {
        Path filePath = resolveStoragePath(storageKey);
        Files.deleteIfExists(filePath);
    }

    public Path load(String storageKey) throws IOException {

        // Resolve the file inside the configured storage directory.
        Path filePath = resolveStoragePath(storageKey);

        // Verify that the physical file exists.
        if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
            throw new IOException("Stored document not found");
        }

        return filePath;
    }

    public record StoredFile(
            String storageKey,
            String originalFilename,
            String contentType,
            long fileSize,
            String checksumSha256
    ) {}
}
