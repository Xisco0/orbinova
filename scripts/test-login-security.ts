/**
 * ORBINOVA — LOGIN ERROR MESSAGES AND FIVE-ATTEMPT ACCOUNT LOCKOUT AUTOMATED QA SUITE
 * 
 * Verifies all 10 required combinations:
 * 1. Correct email and wrong password -> "Invalid email or password."
 * 2. Wrong email and wrong password -> "Invalid email or password."
 * 3. Nonexistent email -> "Invalid email or password."
 * 4. Five consecutive incorrect passwords -> "Your account has been locked due to multiple unsuccessful login attempts. Please contact your institution administrator for assistance."
 * 5. Successful login after fewer than five failures.
 * 6. Successful login resetting the failure counter.
 * 7. Locked account attempting another login -> Still locked, no auth permitted.
 * 8. Administrator unlocking a locked account -> Restores access + audit trail.
 * 9. Concurrent login attempts -> Atomic protection prevents threshold bypass.
 * 10. Rate-limit cooldown expiry -> Restores rate limit access; locked account remains locked.
 */

import { rateLimiter, RATE_LIMIT_CONFIG } from "../src/lib/auth/rateLimiter";
import { accountSecurity, ACCOUNT_SECURITY_CONFIG } from "../src/lib/auth/accountSecurity";
import { auditLogger } from "../src/lib/audit/auditLogger";
import { staffStore } from "../src/services/staffStore";
import fs from "fs";
import path from "path";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}${detail ? ` (${detail})` : ""}`);
    passCount++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` (${detail})` : ""}`);
    failCount++;
  }
}

async function runLoginSecurityTests() {
  console.log("\n============================================================");
  console.log("ORBINOVA — LOGIN ERROR MESSAGES & ACCOUNT LOCKOUT QA SUITE");
  console.log("============================================================\n");

  const ts = Date.now();
  const testIp = `192.168.2.${Math.floor(Math.random() * 200) + 10}`;

  // Provision an existing account in the authoritative roster
  const existingEmail = `verified-doctor-${ts}@orbinova.com`;
  staffStore.save({
    userId: `user-doc-${ts}`,
    memberId: `member-doc-${ts}`,
    organizationId: "a1111111-1111-1111-1111-111111111111",
    fullName: "Dr. Ngozi Okonjo",
    surname: "Okonjo",
    email: existingEmail,
    memberRole: "doctor",
    isActive: true,
  });
  accountSecurity.registerKnownAccount(existingEmail);

  const nonexistentEmail = `ghost-nonexistent-${ts}@orbinova.com`;
  const wrongFormatEmail = `invalid-user-${ts}@unknown-domain.xyz`;

  // Clean initial state
  await rateLimiter.clearLimit({ ip: testIp, email: existingEmail });
  await rateLimiter.clearLimit({ ip: testIp, email: nonexistentEmail });
  await accountSecurity.unlockAccount(existingEmail);

  // =========================================================================
  // SCENARIO 1: Correct email and wrong password
  // Must return "Invalid email or password."
  // =========================================================================
  console.log("--- 1. Correct Email and Wrong Password ---");
  const scen1 = await accountSecurity.recordFailedAttempt(existingEmail, { ip: testIp });
  assert(!scen1.isLocked, "Scenario 1: Account remains unlocked on first wrong password");
  assert(scen1.message === "Invalid email or password.", `Scenario 1: Returns generic error "${scen1.message}"`);
  assert(scen1.failedCount === 1, "Scenario 1: Failed count is 1");

  // =========================================================================
  // SCENARIO 2: Wrong email and wrong password
  // Must return "Invalid email or password."
  // =========================================================================
  console.log("\n--- 2. Wrong Email and Wrong Password ---");
  const scen2 = await accountSecurity.recordFailedAttempt(wrongFormatEmail, { ip: testIp });
  assert(!scen2.isLocked, "Scenario 2: Returns isLocked = false");
  assert(scen2.message === "Invalid email or password.", `Scenario 2: Returns generic error "${scen2.message}"`);

  // =========================================================================
  // SCENARIO 3: Nonexistent email
  // Must return "Invalid email or password." and NEVER create a fake user account
  // =========================================================================
  console.log("\n--- 3. Nonexistent Email (Anti-Enumeration & No Fake Accounts) ---");
  const scen3 = await accountSecurity.recordFailedAttempt(nonexistentEmail, { ip: testIp });
  assert(!scen3.isLocked, "Scenario 3: Nonexistent email returns isLocked = false");
  assert(scen3.message === "Invalid email or password.", `Scenario 3: Returns exact generic message "${scen3.message}"`);

  // Verify no fake account was persisted in login_attempts.json
  const attemptsStorePath = path.join(process.cwd(), ".data", "login_attempts.json");
  const rawAttempts = JSON.parse(fs.readFileSync(attemptsStorePath, "utf-8"));
  assert(rawAttempts[nonexistentEmail.toLowerCase()] === undefined, "Scenario 3: Nonexistent email DOES NOT create a fake user account record");

  // Reset existing account failed count for clear 5-attempt lockout test
  accountSecurity.recordSuccessfulLogin(existingEmail);

  // =========================================================================
  // SCENARIO 4: Five consecutive incorrect passwords
  // Attempts 1-4: "Invalid email or password."
  // Attempt 5: Account is LOCKED and displays lockout message
  // =========================================================================
  console.log("\n--- 4. Five Consecutive Incorrect Passwords ---");

  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await accountSecurity.recordFailedAttempt(existingEmail, { ip: testIp });
    assert(!res.isLocked, `Scenario 4 (Attempt ${attempt}): Account remains unlocked`);
    assert(res.message === "Invalid email or password.", `Scenario 4 (Attempt ${attempt}): Displays "Invalid email or password."`);
    assert(res.failedCount === attempt, `Scenario 4 (Attempt ${attempt}): Failed count is ${attempt}`);
  }

  // Attempt 5
  const fifthAttempt = await accountSecurity.recordFailedAttempt(existingEmail, { ip: testIp });
  assert(fifthAttempt.isLocked, "Scenario 4 (Attempt 5): Account transitions to LOCKED state");
  assert(fifthAttempt.failedCount === 5, "Scenario 4 (Attempt 5): Failed count reaches 5");
  assert(
    fifthAttempt.message ===
      "Your account has been locked due to multiple unsuccessful login attempts. Please contact your institution administrator for assistance.",
    "Scenario 4 (Attempt 5): Displays exact required lockout message"
  );

  const lockCheck = accountSecurity.isAccountLocked(existingEmail);
  assert(lockCheck.isLocked, "Scenario 4: Lockout confirmed by isAccountLocked");

  // =========================================================================
  // SCENARIO 7: Locked account attempting another login
  // Must prevent further authentication and return lockout message
  // =========================================================================
  console.log("\n--- 7. Locked Account Attempting Another Login ---");
  const lockedAttempt = await accountSecurity.recordFailedAttempt(existingEmail, { ip: testIp });
  assert(lockedAttempt.isLocked, "Scenario 7: Further password authentication blocked while account is locked");
  assert(
    lockedAttempt.message ===
      "Your account has been locked due to multiple unsuccessful login attempts. Please contact your institution administrator for assistance.",
    "Scenario 7: Returns lockout message without evaluating password"
  );

  // =========================================================================
  // SCENARIO 8: Administrator unlocking a locked account
  // Allows only authorized administrators to unlock it; logs audit trail
  // =========================================================================
  console.log("\n--- 8. Administrator Unlocking a Locked Account ---");
  const adminActor = {
    userId: "admin-hospital-owner-001",
    role: "owner",
    organizationId: "a1111111-1111-1111-1111-111111111111",
    ipAddress: testIp,
  };

  const unlocked = await accountSecurity.unlockAccount(existingEmail, adminActor);
  assert(unlocked, "Scenario 8: Administrator successfully unlocks account");

  const postUnlockStatus = accountSecurity.isAccountLocked(existingEmail);
  assert(!postUnlockStatus.isLocked, "Scenario 8: Account is verified unlocked");

  const unlockAudit = auditLogger.getLogs({ entityId: existingEmail.toLowerCase(), action: "ACCOUNT_UNLOCKED" });
  assert(unlockAudit.length > 0, "Scenario 8: ACCOUNT_UNLOCKED event recorded in audit trail");
  assert(unlockAudit[0].action === "ACCOUNT_UNLOCKED", "Scenario 8: Audit log action matches ACCOUNT_UNLOCKED");

  // =========================================================================
  // SCENARIO 5 & 6: Successful login after fewer than 5 failures & counter reset
  // =========================================================================
  console.log("\n--- 5 & 6. Successful Login Resets Consecutive Failed Counter ---");
  // 3 incorrect passwords
  await accountSecurity.recordFailedAttempt(existingEmail, { ip: testIp });
  await accountSecurity.recordFailedAttempt(existingEmail, { ip: testIp });
  const thirdFail = await accountSecurity.recordFailedAttempt(existingEmail, { ip: testIp });
  assert(thirdFail.failedCount === 3, "Scenario 5: Recorded 3 failed attempts");
  assert(!thirdFail.isLocked, "Scenario 5: Account is not locked after 3 failures");
  assert(thirdFail.message === "Invalid email or password.", "Scenario 5: Generic message displayed");

  // User now enters CORRECT credentials -> Successful login
  accountSecurity.recordSuccessfulLogin(existingEmail);

  // Verify counter is reset to 0
  const freshAttempts = JSON.parse(fs.readFileSync(attemptsStorePath, "utf-8"));
  assert(freshAttempts[existingEmail.toLowerCase()] === undefined, "Scenario 6: Failed attempt counter completely reset upon successful authentication");

  // Now, failing again starts fresh from Attempt 1 (not locked on 2nd attempt)
  const freshFail = await accountSecurity.recordFailedAttempt(existingEmail, { ip: testIp });
  assert(freshFail.failedCount === 1, "Scenario 6: Next failed attempt starts cleanly at 1");
  assert(!freshFail.isLocked, "Scenario 6: Account is NOT locked");

  // Clean state for concurrency test
  accountSecurity.recordSuccessfulLogin(existingEmail);

  // =========================================================================
  // SCENARIO 9: Concurrent login attempts
  // Multiple tabs and concurrent requests cannot bypass the 5-attempt threshold
  // =========================================================================
  console.log("\n--- 9. Concurrent Login Requests (Atomic Threshold Protection) ---");
  const concurrentEmail = `concur-doc-${ts}@orbinova.com`;
  staffStore.save({
    userId: `user-concur-${ts}`,
    memberId: `member-concur-${ts}`,
    organizationId: "a1111111-1111-1111-1111-111111111111",
    fullName: "Dr. Aminu Bello",
    surname: "Bello",
    email: concurrentEmail,
    memberRole: "doctor",
    isActive: true,
  });
  accountSecurity.registerKnownAccount(concurrentEmail);

  // Fire 10 simultaneous failed login requests concurrently
  const concurrentResults = await Promise.all([
    accountSecurity.recordFailedAttempt(concurrentEmail, { ip: testIp }),
    accountSecurity.recordFailedAttempt(concurrentEmail, { ip: testIp }),
    accountSecurity.recordFailedAttempt(concurrentEmail, { ip: testIp }),
    accountSecurity.recordFailedAttempt(concurrentEmail, { ip: testIp }),
    accountSecurity.recordFailedAttempt(concurrentEmail, { ip: testIp }),
    accountSecurity.recordFailedAttempt(concurrentEmail, { ip: testIp }),
    accountSecurity.recordFailedAttempt(concurrentEmail, { ip: testIp }),
    accountSecurity.recordFailedAttempt(concurrentEmail, { ip: testIp }),
    accountSecurity.recordFailedAttempt(concurrentEmail, { ip: testIp }),
    accountSecurity.recordFailedAttempt(concurrentEmail, { ip: testIp }),
  ]);

  const unlockedResponses = concurrentResults.filter((r) => !r.isLocked);
  const lockedResponses = concurrentResults.filter((r) => r.isLocked);

  assert(unlockedResponses.length === 4, `Scenario 9: Exactly first 4 requests received unlocked error (Got: ${unlockedResponses.length})`);
  assert(lockedResponses.length === 6, `Scenario 9: Requests 5 through 10 locked account atomically (Got: ${lockedResponses.length})`);
  assert(
    lockedResponses.every((r) => r.message === ACCOUNT_SECURITY_CONFIG.LOCKOUT_MESSAGE),
    "Scenario 9: All locked responses returned exact lockout message"
  );

  // =========================================================================
  // SCENARIO 10: Rate-limit cooldown expiry & independence from lockout
  // Rate-limit cooldown expires automatically after 5 minutes;
  // Account lockout REMAINS LOCKED (never auto-unlocks on cooldown).
  // =========================================================================
  console.log("\n--- 10. Rate-Limit Cooldown Expiry & Independence From Lockout ---");
  const rateLimitKey = `login:${testIp}:${concurrentEmail.toLowerCase()}`;
  const rateLimitsFile = path.join(process.cwd(), ".data", "login_rate_limits.json");

  // Simulate 6 login attempts to trigger 5-minute rate limit cooldown
  for (let i = 1; i <= 6; i++) {
    await rateLimiter.recordAttempt({ ip: testIp, email: concurrentEmail });
  }

  const rateLimitStatus = rateLimiter.checkLimit({ ip: testIp, email: concurrentEmail });
  assert(rateLimitStatus.isLimited, "Scenario 10: Rate limit active after 6 attempts");
  assert(
    Boolean(rateLimitStatus.message?.includes("Too many login attempts. Please try again in 5 minutes.")),
    "Scenario 10: Displays rate limit message"
  );

  // Simulate expiry of 5-minute rate limit cooldown
  const storedLimits = JSON.parse(fs.readFileSync(rateLimitsFile, "utf-8"));
  if (storedLimits[rateLimitKey]) {
    storedLimits[rateLimitKey].cooldownUntil = Date.now() - 1000; // Past
    fs.writeFileSync(rateLimitsFile, JSON.stringify(storedLimits, null, 2), "utf-8");
  }

  const expiredRateCheck = rateLimiter.checkLimit({ ip: testIp, email: concurrentEmail });
  assert(!expiredRateCheck.isLimited, "Scenario 10: Rate limit cooldown expired automatically after 5 minutes");

  // CRITICAL: Account lockout MUST STILL BE LOCKED!
  const accountStillLocked = accountSecurity.isAccountLocked(concurrentEmail);
  assert(accountStillLocked.isLocked, "Scenario 10: Account REMAINS LOCKED after rate-limit cooldown expires (Independence verified)");

  console.log("\n============================================================");
  console.log(`TOTAL SCENARIOS VERIFIED: ${passCount + failCount}`);
  console.log(`PASSED: ${passCount}`);
  console.log(`FAILED: ${failCount}`);
  console.log("============================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runLoginSecurityTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
