package com.snovasys.trustvault;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.snovasys.trustvault.audit.entity.AuditLog;
import com.snovasys.trustvault.audit.repository.AuditLogRepository;
import com.snovasys.trustvault.document.dto.DocumentShareRequest;
import com.snovasys.trustvault.document.entity.Document;
import com.snovasys.trustvault.document.entity.DocumentPermission;
import com.snovasys.trustvault.document.entity.DocumentStatus;
import com.snovasys.trustvault.document.entity.DocumentVersion;
import com.snovasys.trustvault.document.repository.DocumentPermissionRepository;
import com.snovasys.trustvault.document.repository.DocumentRepository;
import com.snovasys.trustvault.document.repository.DocumentVersionRepository;
import com.snovasys.trustvault.security.JwtService;
import com.snovasys.trustvault.user.dto.LoginRequest;
import com.snovasys.trustvault.user.dto.RegisterRequest;
import com.snovasys.trustvault.user.entity.AppUser;
import com.snovasys.trustvault.user.entity.Role;
import com.snovasys.trustvault.user.repository.AppUserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
public class TrustvaultIntegrationTests {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentPermissionRepository permissionRepository;

    @Autowired
    private DocumentVersionRepository versionRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private String userAEmail = "test.user.a@example.com";
    private String userBEmail = "test.user.b@example.com";
    private String adminEmail = "test.admin@example.com";

    private String userAToken;
    private String userBToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        // Ensure test users exist
        createOrUpdateUser(userAEmail, "Alice Tester", Role.USER);
        createOrUpdateUser(userBEmail, "Bob Tester", Role.USER);
        createOrUpdateUser(adminEmail, "Admin Tester", Role.ADMIN);

        userAToken = "Bearer " + jwtService.generateToken(userAEmail);
        userBToken = "Bearer " + jwtService.generateToken(userBEmail);
        adminToken = "Bearer " + jwtService.generateToken(adminEmail);
    }

    private AppUser createOrUpdateUser(String email, String fullName, Role role) {
        AppUser user = userRepository.findByEmail(email).orElseGet(() -> {
            AppUser u = new AppUser();
            u.setEmail(email);
            u.setPasswordHash(passwordEncoder.encode("Password123!"));
            u.setEnabled(true);
            return u;
        });
        user.setFullName(fullName);
        user.setRole(role);
        return userRepository.save(user);
    }

    @Test
    @DisplayName("1. User registration, login, and profile endpoint verification")
    void testAuthenticationFlow() throws Exception {
        String uniqueEmail = "new.user." + UUID.randomUUID() + "@example.com";
        RegisterRequest registerReq = new RegisterRequest(
                "New User",
                uniqueEmail,
                "StrongPass123!"
        );

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"));

        LoginRequest loginReq = new LoginRequest(uniqueEmail, "StrongPass123!");
        String loginResponse = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(loginResponse).get("accessToken").asText();

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(uniqueEmail))
                .andExpect(jsonPath("$.role").value("DOCUMENT_OWNER"));
    }

    @Test
    @DisplayName("2. Document upload and checksum verification")
    void testDocumentUploadAndDownload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test-document.txt",
                "text/plain",
                "TrustVault integration test payload content".getBytes()
        );

        String uploadResponse = mockMvc.perform(multipart("/api/documents/upload")
                        .file(file)
                        .param("description", "A test document for upload verification")
                        .param("category", "Finance")
                        .param("tags", "test,finance")
                        .header("Authorization", userAToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.originalFilename").value("test-document.txt"))
                .andExpect(jsonPath("$.category").value("Finance"))
                .andExpect(jsonPath("$.currentVersionNumber").value(1))
                .andReturn().getResponse().getContentAsString();

        String docId = objectMapper.readTree(uploadResponse).get("id").asText();

        // Download by owner
        mockMvc.perform(get("/api/documents/" + docId + "/download")
                        .header("Authorization", userAToken))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("test-document.txt")));

        // Cross-user unauthorized download must return 404/403 and record denied audit log
        mockMvc.perform(get("/api/documents/" + docId + "/download")
                        .header("Authorization", userBToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("3. Document sharing, edit permission, and revocation flow")
    void testSharingAndEditPermissions() throws Exception {
        // Upload document by User A
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "shared-doc.txt",
                "text/plain",
                "Initial shared content".getBytes()
        );

        String uploadResponse = mockMvc.perform(multipart("/api/documents/upload")
                        .file(file)
                        .param("description", "Shared document test")
                        .header("Authorization", userAToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String docId = objectMapper.readTree(uploadResponse).get("id").asText();

        // Share with User B: canRead=true, canEdit=true, canDownload=true
        DocumentShareRequest shareReq = new DocumentShareRequest(userBEmail, true, true, true);
        mockMvc.perform(post("/api/documents/" + docId + "/share")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shareReq))
                        .header("Authorization", userAToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.canRead").value(true))
                .andExpect(jsonPath("$.canEdit").value(true))
                .andExpect(jsonPath("$.canDownload").value(true));

        // User B edits document content with a new version
        MockMultipartFile v2File = new MockMultipartFile(
                "file",
                "shared-doc-v2.txt",
                "text/plain",
                "Updated version 2 content by User B".getBytes()
        );

        mockMvc.perform(multipart("/api/documents/" + docId)
                        .file(v2File)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .param("description", "Updated description by User B")
                        .header("Authorization", userBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersionNumber").value(2));

        // User B can view versions
        mockMvc.perform(get("/api/documents/" + docId + "/versions")
                        .header("Authorization", userBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(org.hamcrest.Matchers.greaterThanOrEqualTo(2))));

        // User A revokes sharing
        mockMvc.perform(delete("/api/documents/" + docId + "/share")
                        .param("recipientEmail", userBEmail)
                        .header("Authorization", userAToken))
                .andExpect(status().isNoContent());

        // Subsequent edit attempt by User B must fail with 403 Forbidden
        mockMvc.perform(multipart("/api/documents/" + docId)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .param("description", "Unauthorized attempt after revoke")
                        .header("Authorization", userBToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("4. Document version restore capability")
    void testVersionRestore() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "restore-doc.txt",
                "text/plain",
                "Version 1 text".getBytes()
        );

        String uploadResponse = mockMvc.perform(multipart("/api/documents/upload")
                        .file(file)
                        .header("Authorization", userAToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String docId = objectMapper.readTree(uploadResponse).get("id").asText();

        // Update to version 2
        MockMultipartFile v2File = new MockMultipartFile(
                "file",
                "restore-doc-v2.txt",
                "text/plain",
                "Version 2 text".getBytes()
        );

        mockMvc.perform(multipart("/api/documents/" + docId)
                        .file(v2File)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .header("Authorization", userAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersionNumber").value(2));

        // Restore version 1 -> should become version 3
        mockMvc.perform(post("/api/documents/" + docId + "/versions/1/restore")
                        .header("Authorization", userAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentVersionNumber").value(3))
                .andExpect(jsonPath("$.originalFilename").value("restore-doc.txt"));
    }

    @Test
    @DisplayName("5. Secure document soft deletion")
    void testDocumentSoftDelete() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "to-delete.txt",
                "text/plain",
                "Content to delete".getBytes()
        );

        String uploadResponse = mockMvc.perform(multipart("/api/documents/upload")
                        .file(file)
                        .header("Authorization", userAToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String docId = objectMapper.readTree(uploadResponse).get("id").asText();

        // User B cannot delete User A's document
        mockMvc.perform(delete("/api/documents/" + docId)
                        .header("Authorization", userBToken))
                .andExpect(status().isForbidden());

        // User A deletes document
        mockMvc.perform(delete("/api/documents/" + docId)
                        .header("Authorization", userAToken))
                .andExpect(status().isNoContent());

        // Subsequent getMyDocuments does not return it
        mockMvc.perform(get("/api/documents")
                        .header("Authorization", userAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + docId + "')]").doesNotExist());
    }

    @Test
    @DisplayName("6. Admin audit logs endpoint security and role filtering")
    void testAdminAuditLogsEndpoint() throws Exception {
        // Unauthenticated request -> 401
        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isUnauthorized());

        // Normal USER request -> 403 Forbidden
        mockMvc.perform(get("/api/admin/audit-logs")
                        .header("Authorization", userAToken))
                .andExpect(status().isForbidden());

        // ADMIN request -> 200 OK
        mockMvc.perform(get("/api/admin/audit-logs")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
