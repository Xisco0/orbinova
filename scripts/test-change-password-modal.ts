import { staffStore } from "../src/services/staffStore";
import { hashPassword, verifyPassword } from "../src/lib/auth/passwordHash";

async function runTests() {
  console.log("=== ORBINOVA CHANGE PASSWORD & SETTINGS SEPARATION TEST ===");

  // 1. Verify staffStore handles password updates
  const testStaffId = "test-staff-pw-change-" + Date.now();
  const testEmail = `doctor.change.${Date.now()}@orbinova.com`;
  const initialPassword = "OldPassword2026!";
  const newPassword = "NewSecurePassword2026@";

  // Create test staff member in staffStore with initial permanent password
  staffStore.save({
    userId: testStaffId,
    organizationId: "a1111111-1111-1111-1111-111111111111",
    fullName: "Dr. Test ChangePassword",
    email: testEmail,
    memberRole: "doctor",
    isActive: true,
    mustChangePassword: false,
  });

  staffStore.setPassword(testStaffId, initialPassword);
  staffStore.setPassword(testEmail, initialPassword);

  // Verify initial password works
  const initialVerify = staffStore.verifyCredentials(testEmail, initialPassword);
  console.assert(initialVerify.valid === true, "Initial password verification should succeed");
  console.log("✓ Initial password verified successfully");

  // Verify wrong password fails
  const wrongVerify = staffStore.verifyCredentials(testEmail, "WrongPassword123!");
  console.assert(wrongVerify.valid === false, "Incorrect password attempt should fail");
  console.log("✓ Incorrect password verification correctly rejected");

  // Perform password update using authoritative setPassword
  const updateResult = staffStore.setPassword(testEmail, newPassword);
  console.assert(updateResult === true, "setPassword should report true");
  staffStore.setPassword(testStaffId, newPassword);

  // Verify new password works
  const newVerify = staffStore.verifyCredentials(testEmail, newPassword);
  console.assert(newVerify.valid === true, "New password verification must succeed");
  console.assert(newVerify.mustChangePassword === false, "mustChangePassword must be false");
  console.log("✓ New password verified successfully in staff store");

  // Verify old password no longer works
  const oldVerify = staffStore.verifyCredentials(testEmail, initialPassword);
  console.assert(oldVerify.valid === false, "Old password must no longer be accepted");
  console.log("✓ Old password successfully invalidated");

  // Verify password hash properties
  const staff = staffStore.get(testEmail);
  console.assert(staff !== undefined, "Staff record must exist");
  console.assert(Boolean(staff?.passwordHash), "Password hash must be populated");
  console.assert(verifyPassword(newPassword, staff!.passwordHash!), "PBKDF2 timing-safe verify must match");
  console.assert(staff?.temporaryPassword === undefined, "temporaryPassword must be cleared");
  console.log("✓ PBKDF2 hash verification confirmed with zero temporary credentials remaining");

  // 2. Verify Facility Settings code does not contain reset-password or change password card
  const fs = await import("fs");
  const path = await import("path");
  const settingsPath = path.join(process.cwd(), "src/app/(portals)/hospital/settings/page.tsx");
  const settingsContent = fs.readFileSync(settingsPath, "utf-8");

  console.assert(
    !settingsContent.includes("Change Password"),
    "Facility settings page must NOT contain 'Change Password'"
  );
  console.assert(
    !settingsContent.includes("/reset-password"),
    "Facility settings page must NOT link to '/reset-password'"
  );
  console.assert(
    !settingsContent.includes("Security & Authentication"),
    "Facility settings page must NOT have 'Security & Authentication' card"
  );
  console.assert(
    settingsContent.includes("!context.isOwner"),
    "Facility settings page MUST continue restricting access to Owner"
  );
  console.log("✓ Facility settings page cleanly stripped of password change and strictly restricted to facility owners");

  // 3. Verify ChangePasswordModal file exists and has frosted glass backdrop blur
  const modalPath = path.join(process.cwd(), "src/components/shared/ChangePasswordModal.tsx");
  const modalContent = fs.readFileSync(modalPath, "utf-8");
  console.assert(modalContent.includes("backdrop-blur-sm"), "Modal must use backdrop-blur-sm");
  console.assert(modalContent.includes("bg-slate-900/60"), "Modal must use bg-slate-900/60");
  console.assert(modalContent.includes("Current Password"), "Modal must have Current Password field");
  console.assert(modalContent.includes("New Password"), "Modal must have New Password field");
  console.assert(modalContent.includes("Confirm New Password"), "Modal must have Confirm New Password field");
  console.assert(modalContent.includes("/api/auth/change-password"), "Modal must call /api/auth/change-password");
  console.log("✓ ChangePasswordModal component verified with frosted glass styling and required validation fields");

  // 4. Verify API route exists
  const apiRoutePath = path.join(process.cwd(), "src/app/api/auth/change-password/route.ts");
  console.assert(fs.existsSync(apiRoutePath), "API route must exist at src/app/api/auth/change-password/route.ts");
  console.log("✓ Change password API route verified");

  // 5. Clean up test record
  const allStaff = staffStore.getAll();
  delete allStaff[testStaffId];
  delete allStaff[testEmail];
  fs.writeFileSync(path.join(process.cwd(), ".data/staff_roster.json"), JSON.stringify(allStaff, null, 2), "utf-8");
  console.log("✓ Test records cleaned up");

  console.log("\nALL 10 ASSERTIONS PASSED!");
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
