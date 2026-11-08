package com.snovasys.trustvault.document.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
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
    private final JdbcTemplate jdbcTemplate;

    public FileStorageService(
            @Value("${trustvault.storage.location}") String storageLocation,
            @Autowired(required = false) JdbcTemplate jdbcTemplate) {

        this.storageDirectory = Path.of(storageLocation)
                .toAbsolutePath()
                .normalize();
        this.jdbcTemplate = jdbcTemplate;
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

            long size = Files.size(destination);

            // Persist to database blob table so files survive container restarts & redeploys on Render
            if (jdbcTemplate != null) {
                try {
                    byte[] data = Files.readAllBytes(destination);
                    jdbcTemplate.update("DELETE FROM document_blobs WHERE storage_key = ?", storageKey);
                    jdbcTemplate.update("INSERT INTO document_blobs (storage_key, data) VALUES (?, ?)", storageKey, data);
                } catch (Exception ignored) {
                    // Non-fatal if database migration is still in progress
                }
            }

            return new StoredFile(
                    storageKey,
                    originalFilename,
                    contentType,
                    size,
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

        if (jdbcTemplate != null) {
            try {
                byte[] data = Files.readAllBytes(destination);
                jdbcTemplate.update("INSERT INTO document_blobs (storage_key, data) VALUES (?, ?)", newStorageKey, data);
            } catch (Exception ignored) {}
        }

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

        if (jdbcTemplate != null) {
            try {
                jdbcTemplate.update("DELETE FROM document_blobs WHERE storage_key = ?", storageKey);
            } catch (Exception ignored) {}
        }
    }

    public Path load(String storageKey) throws IOException {

        // Resolve the file inside the configured storage directory.
        Path filePath = resolveStoragePath(storageKey);

        // 1. Verify if the physical file exists and is non-empty on disk.
        if (Files.exists(filePath) && Files.isRegularFile(filePath) && Files.size(filePath) > 0) {
            return filePath;
        }

        // 2. If missing from disk (e.g. Render container restarted or redeployed),
        // restore seamlessly from persistent database blob storage!
        if (jdbcTemplate != null) {
            try {
                byte[] blobData = jdbcTemplate.queryForObject(
                        "SELECT data FROM document_blobs WHERE storage_key = ?",
                        byte[].class,
                        storageKey
                );

                if (blobData != null && blobData.length > 0) {
                    Files.createDirectories(storageDirectory);
                    Files.write(filePath, blobData);
                    return filePath;
                }
            } catch (Exception ignored) {
                // Not found in DB either
            }
        }

        throw new IOException("Stored document not found");
    }

    public record StoredFile(
            String storageKey,
            String originalFilename,
            String contentType,
            long fileSize,
            String checksumSha256
    ) {}
}
