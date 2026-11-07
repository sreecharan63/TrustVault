package com.snovasys.trustvault;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.snovasys.trustvault.audit.entity.AuditLog;
import com.snovasys.trustvault.document.dto.DocumentShareRequest;
import com.snovasys.trustvault.document.repository.DocumentPermissionRepository;
import com.snovasys.trustvault.document.repository.DocumentRepository;
import com.snovasys.trustvault.security.JwtService;
import com.snovasys.trustvault.user.entity.AppUser;
import com.snovasys.trustvault.user.entity.Role;
import com.snovasys.trustvault.user.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
public class SecurityAttackTests {

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
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private String victimEmail = "victim.user@example.com";
    private String attackerEmail = "attacker.user@example.com";
    private String adminEmail = "test.admin@example.com";

    private String victimToken;
    private String attackerToken;
    private String adminToken;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .webAppContextSetup(context)
                .apply(springSecurity())
                .build();

        createOrUpdateUser(victimEmail, "Victim User", Role.USER);
        createOrUpdateUser(attackerEmail, "Attacker User", Role.USER);
        createOrUpdateUser(adminEmail, "Admin Tester", Role.ADMIN);

        victimToken = "Bearer " + jwtService.generateToken(victimEmail);
        attackerToken = "Bearer " + jwtService.generateToken(attackerEmail);
        adminToken = "Bearer " + jwtService.generateToken(adminEmail);
    }

    private AppUser createOrUpdateUser(String email, String fullName, Role role) {
        return userRepository.findByEmail(email).orElseGet(() -> {
            AppUser user = new AppUser();
            user.setEmail(email);
            user.setFullName(fullName);
            user.setPasswordHash(passwordEncoder.encode("Password123!"));
            user.setRole(role);
            user.setEnabled(true);
            return userRepository.save(user);
        });
    }

    @Test
    @DisplayName("ATTACK 1: IDOR / Cross-Tenant Breach - Attacker cannot download unshared document; attempt is rejected and audited")
    void testCrossTenantDirectObjectReferenceDeniedAndAudited() throws Exception {
        // Victim uploads confidential file
        MockMultipartFile file = new MockMultipartFile(
                "file", "confidential-q3.txt", "text/plain", "Top Secret Financial Data".getBytes()
        );

        String uploadRes = mockMvc.perform(multipart("/api/documents/upload")
                        .file(file)
                        .param("title", "Confidential Q3 Report")
                        .param("category", "Finance")
                        .header("Authorization", victimToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        Map<?, ?> docMap = objectMapper.readValue(uploadRes, Map.class);
        String docId = (String) docMap.get("id");

        // Attacker attempts to download Victim's document directly by UUID -> Denied (404 Not Found to prevent enumeration)
        mockMvc.perform(get("/api/documents/" + docId + "/download")
                        .header("Authorization", attackerToken))
                .andExpect(status().isNotFound());

        // Verify that the server recorded this unauthorized attempt in the persistent audit log with outcome DENIED
        Integer deniedCount = jdbcTemplate.queryForObject(
                "SELECT count(*) FROM audit_logs WHERE actor_email = ? AND outcome = 'DENIED' AND resource_id = ?",
                Integer.class,
                attackerEmail,
                UUID.fromString(docId)
        );
        assertThat(deniedCount).isGreaterThan(0);
    }

    @Test
    @DisplayName("ATTACK 2: Privilege Escalation - Viewer with read-only cannot edit or overwrite document")
    void testReadOnlyUserCannotEditDocument() throws Exception {
        // Victim uploads file
        MockMultipartFile file = new MockMultipartFile(
                "file", "spec.txt", "text/plain", "Original Specification".getBytes()
        );
        String uploadRes = mockMvc.perform(multipart("/api/documents/upload")
                        .file(file)
                        .param("title", "Project Spec")
                        .header("Authorization", victimToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String docId = (String) objectMapper.readValue(uploadRes, Map.class).get("id");

        // Victim grants READ permission only (canEdit = false)
        DocumentShareRequest shareReq = new DocumentShareRequest(
                attackerEmail, true, false, true
        );
        mockMvc.perform(post("/api/documents/" + docId + "/share")
                        .header("Authorization", victimToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shareReq)))
                .andExpect(status().isCreated());

        // Attacker attempts to edit document metadata via PUT without canEdit privilege
        mockMvc.perform(multipart(HttpMethod.PUT, "/api/documents/" + docId)
                        .param("description", "Tampered Description")
                        .header("Authorization", attackerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ATTACK 3: Immediate Revocation - Revoked user is cut off instantly on subsequent request")
    void testImmediateRevocationCutsOffAccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "contract.txt", "text/plain", "Contract Terms".getBytes()
        );
        String uploadRes = mockMvc.perform(multipart("/api/documents/upload")
                        .file(file)
                        .param("title", "Contract")
                        .header("Authorization", victimToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String docId = (String) objectMapper.readValue(uploadRes, Map.class).get("id");

        // Grant access
        DocumentShareRequest shareReq = new DocumentShareRequest(
                attackerEmail, true, false, true
        );
        mockMvc.perform(post("/api/documents/" + docId + "/share")
                        .header("Authorization", victimToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shareReq)))
                .andExpect(status().isCreated());

        // Attacker downloads successfully while permission is active
        mockMvc.perform(get("/api/documents/" + docId + "/download")
                        .header("Authorization", attackerToken))
                .andExpect(status().isOk());

        // Victim revokes permission immediately
        mockMvc.perform(delete("/api/documents/" + docId + "/share")
                        .param("recipientEmail", attackerEmail)
                        .header("Authorization", victimToken))
                .andExpect(status().isNoContent());

        // Attacker IMMEDIATELY attempts to download again -> MUST be rejected immediately (NOT FOUND / FORBIDDEN)
        mockMvc.perform(get("/api/documents/" + docId + "/download")
                        .header("Authorization", attackerToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("ATTACK 4: Audit Tampering - Direct database UPDATE or DELETE on audit_logs is blocked by trigger")
    void testAuditTrailImmutabilityTriggerPreventsModifications() {
        // Attempt to UPDATE an audit record directly via SQL
        assertThatThrownBy(() -> {
            jdbcTemplate.update("UPDATE audit_logs SET event_type = 'TAMPERED' WHERE id IN (SELECT id FROM audit_logs LIMIT 1)");
        }).isInstanceOf(DataAccessException.class)
          .hasMessageContaining("Audit logs are append-only");

        // Attempt to DELETE an audit record directly via SQL
        assertThatThrownBy(() -> {
            jdbcTemplate.update("DELETE FROM audit_logs WHERE id IN (SELECT id FROM audit_logs LIMIT 1)");
        }).isInstanceOf(DataAccessException.class)
          .hasMessageContaining("Audit logs are append-only");
    }

    @Test
    @DisplayName("ATTACK 5: Unauthenticated Requests - Access without valid JWT is rejected with 401")
    void testUnauthenticatedAccessRejected() throws Exception {
        mockMvc.perform(get("/api/documents"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/admin/audit-logs"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("ATTACK 6: Role Enforcement - VIEWER cannot upload documents (Forbidden 403)")
    void testViewerCannotUploadDocuments() throws Exception {
        String viewerEmail = "viewer.test@example.com";
        createOrUpdateUser(viewerEmail, "Viewer Test", Role.VIEWER);
        String viewerToken = "Bearer " + jwtService.generateToken(viewerEmail);

        MockMultipartFile file = new MockMultipartFile(
                "file", "unauthorized-doc.pdf", "application/pdf", "Viewer File Content".getBytes()
        );

        mockMvc.perform(multipart("/api/documents/upload")
                        .file(file)
                        .param("title", "Unauthorized Upload")
                        .header("Authorization", viewerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ROLE VERIFICATION: Admin has full rights to control and manage all documents across the platform")
    void testAdminHasFullSupervisoryRightsToAnyDocument() throws Exception {
        // Victim uploads a file
        MockMultipartFile file = new MockMultipartFile(
                "file", "victim-contract.pdf", "application/pdf", "Secret Contract".getBytes()
        );
        String uploadRes = mockMvc.perform(multipart("/api/documents/upload")
                        .file(file)
                        .param("title", "Victim Contract")
                        .param("category", "Legal")
                        .header("Authorization", victimToken))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String docId = (String) objectMapper.readValue(uploadRes, Map.class).get("id");

        // Admin can download victim's document directly without prior permission grant
        mockMvc.perform(get("/api/documents/" + docId + "/download")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());

        // Admin can edit victim's document metadata
        mockMvc.perform(multipart(HttpMethod.PUT, "/api/documents/" + docId)
                        .param("description", "Admin Reviewed and Approved")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());

        // Admin can share victim's document with another user
        DocumentShareRequest shareReq = new DocumentShareRequest(
                attackerEmail, true, false, true
        );
        mockMvc.perform(post("/api/documents/" + docId + "/share")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(shareReq)))
                .andExpect(status().isCreated());

        // Admin can delete victim's document
        mockMvc.perform(delete("/api/documents/" + docId)
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());
    }
}
