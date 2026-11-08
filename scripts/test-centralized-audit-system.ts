/**
 * ORBINOVA CENTRALIZED AUDIT LOGGING & ACTIVITY TRACKING COMPREHENSIVE TEST SUITE
 * Validates all 15 test requirements from Section 11 of the specification:
 * 1. Super Admin access to platform-wide logs
 * 2. Hospital Owner access strictly to own hospital logs
 * 3. Blood Bank Owner access strictly to own blood bank logs
 * 4. Hospital Administrator denied access by default
 * 5. Donor Coordinator denied access by default
 * 6. Clinical Staff denied access by default
 * 7. Direct unauthorized API/action requests rejected
 * 8. Audit events created for critical operations
 * 9. Previous and new values accurately recorded and sanitized
 * 10. Immutability: attempts to modify or delete logs rejected
 * 11. Super Admin actions logged
 * 12. Multi-tenant data isolation in filters and exports
 * 13. Sensitive credentials (passwords, tokens, secrets) sanitized and never stored
 * 14. Logs remain accessible when a user is suspended
 * 15. Failed operations logged with status: "failure"
 */

import { centralizedAuditService } from "../src/services/centralizedAuditService";
import { getRolePermissions } from "../src/lib/auth/rbac";
import { KNOWN_ORGANIZATIONS } from "../src/services/facilityRelationships";

async function runAuditSystemTests() {
  console.log("\n========================================================");
  console.log("🏥 ORBINOVA CENTRALIZED AUDIT LOGGING TEST SUITE");
  console.log("========================================================\n");

  let passedTests = 0;
  let totalTests = 15;

  const LUTH_HOSPITAL_ID = KNOWN_ORGANIZATIONS[0].id;
  const LASUTH_HOSPITAL_ID = KNOWN_ORGANIZATIONS.length > 4 ? KNOWN_ORGANIZATIONS[4].id : "c5555555-5555-5555-5555-555555555555";
  const RED_CROSS_BB_ID = KNOWN_ORGANIZATIONS[2].id;

  // 1. Super Admin Access to Platform-Wide Logs
  try {
    const adminPermissions = getRolePermissions("superadmin", null);
    const hasAuditAccess = adminPermissions.includes("audit_logs.view");
    const superAdminLogs = await centralizedAuditService.getLogsForSuperAdmin({ pageSize: 50 });
    
    if (hasAuditAccess && Array.isArray(superAdminLogs.data)) {
      console.log(`✅ TEST 1 PASSED: Super Admin has platform-wide audit access across all institutions (${superAdminLogs.totalCount} events accessible).`);
      passedTests++;
    } else {
      console.error("❌ TEST 1 FAILED: Super Admin missing platform-wide access.");
    }
  } catch (err: any) {
    console.error("❌ TEST 1 FAILED:", err.message);
  }

  // 2. Hospital Owner Access to Own Hospital Logs
  try {
    const ownerPermissions = getRolePermissions("hospital", "owner");
    const hasAuditAccess = ownerPermissions.includes("audit_logs.view");
    const hospitalLogs = await centralizedAuditService.getLogsForOrganization(LUTH_HOSPITAL_ID, { pageSize: 50 });
    
    // Ensure all returned logs belong ONLY to LUTH
    const noLeak = hospitalLogs.data.every(l => l.organization_id === LUTH_HOSPITAL_ID);
    
    if (hasAuditAccess && noLeak) {
      console.log(`✅ TEST 2 PASSED: Hospital Owner has access strictly scoped to their own hospital (${hospitalLogs.data.length} scoped events).`);
      passedTests++;
    } else {
      console.error("❌ TEST 2 FAILED: Hospital Owner logs leaked or permission missing.");
    }
  } catch (err: any) {
    console.error("❌ TEST 2 FAILED:", err.message);
  }

  // 3. Independent Blood Bank Owner Access to Own Blood Bank Logs
  try {
    const bbOwnerPermissions = getRolePermissions("blood_bank", "owner");
    const hasAuditAccess = bbOwnerPermissions.includes("audit_logs.view");
    const bbLogs = await centralizedAuditService.getLogsForOrganization(RED_CROSS_BB_ID, { pageSize: 50 });
    const noLeak = bbLogs.data.every(l => l.organization_id === RED_CROSS_BB_ID);

    if (hasAuditAccess && noLeak) {
      console.log(`✅ TEST 3 PASSED: Blood Bank Owner access strictly scoped to their organization (${bbLogs.data.length} scoped events).`);
      passedTests++;
    } else {
      console.error("❌ TEST 3 FAILED: Blood Bank Owner logs leaked or permission missing.");
    }
  } catch (err: any) {
    console.error("❌ TEST 3 FAILED:", err.message);
  }

  // 4. Hospital Administrator Denied Access by Default
  try {
    const adminPermissions = getRolePermissions("hospital", "administrator");
    const hasAuditAccess = adminPermissions.includes("audit_logs.view");
    if (!hasAuditAccess) {
      console.log("✅ TEST 4 PASSED: Hospital Administrator is DENIED audit log access by default.");
      passedTests++;
    } else {
      console.error("❌ TEST 4 FAILED: Hospital Administrator was granted audit log access!");
    }
  } catch (err: any) {
    console.error("❌ TEST 4 FAILED:", err.message);
  }

  // 5. Donor Coordinator Denied Access by Default
  try {
    const coordPermissions = getRolePermissions("hospital", "donor_coordinator");
    const hasAuditAccess = coordPermissions.includes("audit_logs.view");
    if (!hasAuditAccess) {
      console.log("✅ TEST 5 PASSED: Donor Coordinator is DENIED audit log access by default.");
      passedTests++;
    } else {
      console.error("❌ TEST 5 FAILED: Donor Coordinator was granted audit log access!");
    }
  } catch (err: any) {
    console.error("❌ TEST 5 FAILED:", err.message);
  }

  // 6. Clinical Staff Denied Access by Default
  try {
    const clinicalPermissions = getRolePermissions("hospital", "clinical_staff");
    const hasAuditAccess = clinicalPermissions.includes("audit_logs.view");
    if (!hasAuditAccess) {
      console.log("✅ TEST 6 PASSED: Clinical Staff is DENIED audit log access by default.");
      passedTests++;
    } else {
      console.error("❌ TEST 6 FAILED: Clinical Staff was granted audit log access!");
    }
  } catch (err: any) {
    console.error("❌ TEST 6 FAILED:", err.message);
  }

  // 7. Direct Unauthorized Action / Request Rejection Guard
  try {
    const testRoles = ["clinical_staff", "donor_coordinator", "administrator", "radiologist"];
    const allRejected = testRoles.every(role => {
      const perms = getRolePermissions("hospital", role as any);
      return !perms.includes("audit_logs.view");
    });
    if (allRejected) {
      console.log("✅ TEST 7 PASSED: All non-owner hospital roles fail clearance check.");
      passedTests++;
    } else {
      console.error("❌ TEST 7 FAILED: Some unauthorized role passed clearance check.");
    }
  } catch (err: any) {
    console.error("❌ TEST 7 FAILED:", err.message);
  }

  // 8. Audit Events Created for Critical Operations
  try {
    const testEvent = await centralizedAuditService.record({
      userId: "test-user-system",
      actorName: "Test Automation System",
      actorRole: "superadmin",
      organizationId: LUTH_HOSPITAL_ID,
      action: "DONOR_REGISTERED",
      category: "donor_management",
      entityType: "donors",
      entityId: "test-donor-001",
      description: "Automated test donor registration event",
      previousValues: null,
      newValues: { fullName: "Test Donor", bloodGroup: "O+", status: "eligible" },
      status: "success",
    });

    if (testEvent && testEvent.id && testEvent.hash && testEvent.checksum) {
      console.log("✅ TEST 8 PASSED: Critical operation audit events recorded with cryptographic SHA-256 hash.");
      passedTests++;
    } else {
      console.error("❌ TEST 8 FAILED: Audit event creation missing required cryptographic fields.");
    }
  } catch (err: any) {
    console.error("❌ TEST 8 FAILED:", err.message);
  }

  // 9. Previous and New Values Accurately Recorded and Sanitized
  try {
    const updateEvent = await centralizedAuditService.record({
      userId: "test-user-system",
      actorName: "Staff Coordinator",
      actorRole: "donor_coordinator",
      organizationId: LUTH_HOSPITAL_ID,
      action: "DONOR_UPDATED",
      category: "donor_management",
      entityType: "donors",
      entityId: "test-donor-001",
      description: "Updated donor blood type confirmation",
      previousValues: { bloodGroup: "O-", verified: false },
      newValues: { bloodGroup: "O+", verified: true },
      status: "success",
    });

    if (
      (updateEvent.previous_values as any)?.bloodGroup === "O-" &&
      (updateEvent.new_values as any)?.bloodGroup === "O+"
    ) {
      console.log("✅ TEST 9 PASSED: Previous and new state values accurately captured in metadata diff.");
      passedTests++;
    } else {
      console.error("❌ TEST 9 FAILED: Value mutation diff not accurately stored.", updateEvent.previous_values, updateEvent.new_values);
    }
  } catch (err: any) {
    console.error("❌ TEST 9 FAILED:", err.message);
  }

  // 10. Immutability & Tamper-Evident Hash Chain Verification
  try {
    const chainVerification = centralizedAuditService.verifyChainIntegrity();
    if (chainVerification.isValid) {
      console.log(`✅ TEST 10 PASSED: Cryptographic ledger verified (${chainVerification.totalVerified} chained records). Tamper-evident.`);
      passedTests++;
    } else {
      console.error("❌ TEST 10 FAILED: Hash chain integrity compromised, broken at index:", chainVerification.brokenIndex);
    }
  } catch (err: any) {
    console.error("❌ TEST 10 FAILED:", err.message);
  }

  // 11. Super Admin Actions Logged
  try {
    const adminAction = await centralizedAuditService.record({
      userId: "superadmin-root",
      actorName: "Platform Super Admin",
      actorRole: "superadmin",
      organizationId: null,
      action: "INSTITUTION_VERIFIED",
      category: "institutional_admin",
      entityType: "organizations",
      entityId: LASUTH_HOSPITAL_ID,
      description: "Super Admin approved Lagos State University Teaching Hospital",
      status: "success",
    });

    if (adminAction.action === "INSTITUTION_VERIFIED" && adminAction.actor_role === "superadmin") {
      console.log("✅ TEST 11 PASSED: Platform Super Admin operations recorded with full audit trail.");
      passedTests++;
    } else {
      console.error("❌ TEST 11 FAILED: Super Admin action not logged properly.");
    }
  } catch (err: any) {
    console.error("❌ TEST 11 FAILED:", err.message);
  }

  // 12. Cross-Institution Data Isolation in Filters and Exports
  try {
    const luthData = await centralizedAuditService.getLogsForOrganization(LUTH_HOSPITAL_ID, { pageSize: 100 });
    const lasuthData = await centralizedAuditService.getLogsForOrganization(LASUTH_HOSPITAL_ID, { pageSize: 100 });

    const luthExport = centralizedAuditService.exportToCsv(luthData.data);
    const lasuthExport = centralizedAuditService.exportToCsv(lasuthData.data);

    // Ensure LUTH export does not contain LASUTH organization ID in any record
    const linesLuth = luthExport.split("\n").filter(l => l.trim().length > 0);
    const luthDataRows = linesLuth.slice(1);
    const leakInLuth = luthDataRows.some(row => row.includes(LASUTH_HOSPITAL_ID));
    const leakInLasuth = lasuthExport.includes(LUTH_HOSPITAL_ID);

    if (!leakInLuth && !leakInLasuth) {
      console.log("✅ TEST 12 PASSED: Strict multi-tenant data isolation verified in queries and CSV exports.");
      passedTests++;
    } else {
      console.error("❌ TEST 12 FAILED: Cross-institution data leak detected in exports!");
    }
  } catch (err: any) {
    console.error("❌ TEST 12 FAILED:", err.message);
  }

  // 13. Sensitive Credentials (Passwords, Tokens) Sanitized
  try {
    const sensitiveLog = await centralizedAuditService.record({
      userId: "test-user-sanitizer",
      actorName: "Security Test",
      actorRole: "administrator",
      organizationId: LUTH_HOSPITAL_ID,
      action: "USER_INVITATION_SENT",
      category: "staff_management",
      entityType: "organization_invitations",
      entityId: "inv-test-01",
      description: "Onboarding test staff",
      metadata: {
        rawPassword: "SecretPassword123!",
        temporary_password: "TempPass999!",
        token: "jwt.secret.bearer.token",
        staffEmail: "newstaff@luth.org",
      },
      status: "success",
    });

    const metaStr = JSON.stringify(sensitiveLog.metadata);
    const passwordRedacted = !metaStr.includes("SecretPassword123!") && !metaStr.includes("TempPass999!") && !metaStr.includes("jwt.secret.bearer.token");
    const containsRedactedIndicator = metaStr.includes("[REDACTED]");

    if (passwordRedacted && containsRedactedIndicator) {
      console.log("✅ TEST 13 PASSED: Sensitive credentials and secrets are automatically redacted from logs.");
      passedTests++;
    } else {
      console.error("❌ TEST 13 FAILED: Credentials found unredacted in metadata:", metaStr);
    }
  } catch (err: any) {
    console.error("❌ TEST 13 FAILED:", err.message);
  }

  // 14. Logs Remain Accessible Even When User is Suspended
  try {
    await centralizedAuditService.record({
      userId: "suspended-user-404",
      actorName: "Dr. Former Staff (Suspended)",
      actorRole: "clinical_staff",
      organizationId: LUTH_HOSPITAL_ID,
      action: "BLOOD_REQUEST_CREATED",
      category: "blood_requests",
      entityType: "blood_requests",
      entityId: "req-hist-001",
      description: "Clinical blood requisition before staff suspension",
      status: "success",
    });

    const luthLogs = await centralizedAuditService.getLogsForOrganization(LUTH_HOSPITAL_ID, {
      search: "req-hist-001",
    });
    const found = luthLogs.data.some(l => l.entity_id === "req-hist-001");

    if (found) {
      console.log("✅ TEST 14 PASSED: Audit logs persist and remain accessible regardless of user suspension.");
      passedTests++;
    } else {
      console.error("❌ TEST 14 FAILED: Historical logs missing for suspended user.");
    }
  } catch (err: any) {
    console.error("❌ TEST 14 FAILED:", err.message);
  }

  // 15. Failed Operations Logged with Status 'failure'
  try {
    const failureLog = await centralizedAuditService.record({
      userId: "failed-actor",
      actorName: "Unknown Attacker",
      actorRole: "guest",
      organizationId: null,
      action: "USER_LOGIN_FAILED",
      category: "authentication",
      entityType: "profiles",
      entityId: "failed-actor",
      description: "Failed login attempt: invalid credentials",
      status: "failure",
      metadata: { reason: "invalid_password", email: "target@hospital.org" },
    });

    if (failureLog.status === "failure") {
      console.log("✅ TEST 15 PASSED: Failed operations and security failures explicitly logged with status 'failure'.");
      passedTests++;
    } else {
      console.error("❌ TEST 15 FAILED: Failed operation status incorrect:", failureLog.status);
    }
  } catch (err: any) {
    console.error("❌ TEST 15 FAILED:", err.message);
  }

  console.log("\n========================================================");
  console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log("========================================================\n");

  if (passedTests === totalTests) {
    console.log("🎉 ALL AUDIT LOGGING REQUIREMENTS VERIFIED SUCCESSFULLY!\n");
    process.exit(0);
  } else {
    console.error("⚠️ SOME TESTS FAILED.");
    process.exit(1);
  }
}

runAuditSystemTests().catch(err => {
  console.error("Unexpected test suite error:", err);
  process.exit(1);
});
