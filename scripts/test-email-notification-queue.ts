/**
 * ORBINOVA COMPLETE EMAIL NOTIFICATION SYSTEM & BACKGROUND QUEUE VERIFICATION SUITE
 */

import { getEmailConfig, isValidEmail } from "../src/lib/email/config";
import {
  renderMasterLayout,
  renderStaffInvitationEmail,
  renderEmailVerificationEmail,
  renderPasswordResetEmail,
  renderAccountLockoutEmail,
  renderBloodRequestBroadcastEmail,
  renderDonorMatchNotificationEmail,
  renderInventoryAlertEmail,
  renderReservationConfirmationEmail,
} from "../src/lib/email/emailTemplates";
import { emailQueue } from "../src/lib/email/emailQueue";
import { emailOutbox } from "../src/lib/email/emailOutbox";
import { emailDeliveryLedger } from "../src/lib/email/emailDeliveryLedger";
import { emailPreferencesStore } from "../src/lib/email/emailPreferencesStore";
import { accountSecurity } from "../src/lib/auth/accountSecurity";
import { orbinovaEmail } from "../src/lib/email";

console.log("==============================================================================");
console.log("ORBINOVA COMPLETE EMAIL NOTIFICATION SYSTEM & BACKGROUND QUEUE TEST SUITE");
console.log("==============================================================================");

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${title}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${title}`);
    if (details) console.error(`     Details: ${details}`);
    failedCount++;
  }
}

async function runTests() {
  // Clear test stores for clean deterministic run
  emailQueue.clear();
  emailDeliveryLedger.clear();

  // --------------------------------------------------------------------------
  // 1. Centralized Email Infrastructure & Security Validation
  // --------------------------------------------------------------------------
  console.log("\n--- 1. Email Infrastructure & RFC 5322 Validation ---");
  const config = getEmailConfig();
  assert(!!config.fromAddress, `Configured fromAddress: ${config.fromAddress}`);
  assert(!!config.fromName, `Configured fromName: ${config.fromName}`);
  assert(config.queue.maxAttempts === 5, "Configured default retry maximum is 5 attempts");

  assert(isValidEmail("doctor@orbinova.com"), "Valid email 'doctor@orbinova.com' passes RFC 5322 check");
  assert(isValidEmail("staff.specialist+urgent@luth.hospital.ng"), "Plus-addressed valid email passes");
  assert(!isValidEmail("invalid-email-missing-at"), "Malformed email without @ is rejected");
  assert(!isValidEmail("user@domain..com"), "Malformed email with double dots is rejected");

  // --------------------------------------------------------------------------
  // 2. Responsive Email Templates & Plain-Text Alternatives
  // --------------------------------------------------------------------------
  console.log("\n--- 2. Template Branding & Plain-Text Generation ---");
  const staffInvite = renderStaffInvitationEmail({
    fullName: "Dr. Tunde Fasholas",
    roleLabel: "Lead Clinician",
    organizationName: "Lagos University Teaching Hospital",
    invitationUrl: "https://orbinova.health/accept-invitation?token=secure123",
    expiresInDays: 7,
  });
  assert(staffInvite.html.includes("ORBI"), "HTML contains ORBINOVA brand logo");
  assert(staffInvite.html.includes("Lead Clinician"), "HTML contains assigned clinical role");
  assert(staffInvite.html.includes("7 Days"), "HTML contains expiration window");
  assert(!staffInvite.html.includes("StaffPassword2026!"), "Security: Raw passwords are NOT transmitted in email");
  assert(staffInvite.text.includes("ORBINOVA HEALTHCARE NETWORK"), "Plain-text alternative generated cleanly");

  const lockoutTpl = renderAccountLockoutEmail({
    fullName: "Nurse Ngozi",
    email: "ngozi@luth.ng",
    adminContactEmail: "support@orbinova.health",
  });
  assert(lockoutTpl.html.includes("five consecutive unsuccessful login attempts"), "Lockout template states 5 attempts reason");
  assert(lockoutTpl.html.includes("support@orbinova.health"), "Lockout template provides administrator contact instructions");

  const broadcastTpl = renderBloodRequestBroadcastEmail({
    hospitalName: "LUTH",
    requestId: "req-999",
    bloodGroup: "O-",
    unitsRequired: 3,
    urgency: "emergency",
    reviewUrl: "https://orbinova.health/hospital/blood-requests/req-999",
  });
  assert(broadcastTpl.subject.includes("🚨 CRITICAL BROADCAST"), "Emergency urgency prefixes critical indicator in subject");
  assert(broadcastTpl.html.includes("O-"), "HTML specifies exact required blood group");

  // --------------------------------------------------------------------------
  // 3. Background Job Queue & Asynchronous Processing
  // --------------------------------------------------------------------------
  console.log("\n--- 3. Background Queue & Asynchronous Processing ---");
  const testEmail = "test-clinician@orbinova.com";
  const enqueueResult = emailQueue.enqueue({
    to: testEmail,
    subject: "Test Clinical Notification",
    html: "<p>Clinical alert content</p>",
    text: "Clinical alert content",
    category: "blood_requests",
    metadata: { referenceId: "ref-001" },
  });

  assert(enqueueResult.success, "Job enqueued successfully without blocking");
  assert(enqueueResult.status === "queued", "Initial job status is 'queued'");

  // Process batch
  const processed = await emailQueue.processNextBatch();
  assert(processed >= 1, `Worker processed ${processed} queued job(s)`);

  const jobAfterRun = emailQueue.getJob(enqueueResult.jobId);
  assert(jobAfterRun?.status === "sent", "Job status transitioned to 'sent' after successful provider dispatch");
  assert(!!jobAfterRun?.providerMessageId, `Provider message ID recorded: ${jobAfterRun?.providerMessageId}`);

  // --------------------------------------------------------------------------
  // 4. Dead-Letter Queue & Permanent Failure Defense
  // --------------------------------------------------------------------------
  console.log("\n--- 4. Dead-Letter Queue & Invalid Email Rejection ---");
  const badEnqueue = emailQueue.enqueue({
    to: "permanently-invalid-email-address", // fails RFC 5322
    subject: "Invalid Email Test",
    html: "<p>Body</p>",
    category: "auth",
  });

  await emailQueue.processNextBatch();
  const badJob = emailQueue.getJob(badEnqueue.jobId);
  assert(
    badJob?.status === "permanently_failed",
    "Invalid RFC 5322 email moved directly to dead-letter (status: permanently_failed)"
  );
  assert(badJob?.attempts === 1, "Permanently invalid email was NOT endlessly retried (attempts = 1)");

  const deadLetters = emailQueue.getDeadLetterJobs();
  assert(deadLetters.some((d) => d.id === badEnqueue.jobId), "Job exists in dead-letter collection");

  // --------------------------------------------------------------------------
  // 5. Idempotency Protection & Deduplication
  // --------------------------------------------------------------------------
  console.log("\n--- 5. Idempotency Protection & Duplicate Suppression ---");
  const idempotencyKey = "unique-order-key-12345";
  const send1 = emailQueue.enqueue(
    {
      to: "admin@hospital.com",
      subject: "Unique Transaction Alert",
      html: "<p>Alert</p>",
      category: "reservations",
    },
    { idempotencyKey }
  );

  const send2 = emailQueue.enqueue(
    {
      to: "admin@hospital.com",
      subject: "Unique Transaction Alert",
      html: "<p>Alert</p>",
      category: "reservations",
    },
    { idempotencyKey }
  );

  assert(send1.jobId === send2.jobId, "Duplicate enqueue with same idempotencyKey returned existing job ID");

  // --------------------------------------------------------------------------
  // 6. User Notification Preferences & Mandatory Security Exemption
  // --------------------------------------------------------------------------
  console.log("\n--- 6. Notification Preferences & Mandatory Protection ---");
  const donorEmail = "voluntary-donor-42@gmail.com";
  // Opt donor out of donor opportunities
  emailPreferencesStore.update(donorEmail, { donorOpportunities: false });

  assert(
    !emailPreferencesStore.isCategoryAllowed(donorEmail, "donors"),
    "Donor opt-out from 'donors' opportunity notifications is respected"
  );
  assert(
    emailPreferencesStore.isCategoryAllowed(donorEmail, "auth"),
    "Mandatory 'auth' category CANNOT be opted out of"
  );
  assert(
    emailPreferencesStore.isCategoryAllowed(donorEmail, "security"),
    "Mandatory 'security' category CANNOT be opted out of"
  );

  const skippedSend = emailQueue.enqueue({
    to: donorEmail,
    subject: "Donor Opportunity",
    html: "<p>Need blood</p>",
    category: "donors",
  });
  assert(skippedSend.jobId === "skipped-opt-out", "Opted-out non-essential email was skipped before queue insertion");

  // --------------------------------------------------------------------------
  // 7. Transactional Outbox Pattern
  // --------------------------------------------------------------------------
  console.log("\n--- 7. Transactional Outbox Pattern ---");
  const outboxEvent = emailOutbox.recordEvent("TEST_TRANSACTION_COMMITTED", {
    to: "audit@hospital.com",
    subject: "Outbox Guaranteed Message",
    html: "<p>Outbox body</p>",
    category: "institution",
  });

  assert(outboxEvent.status === "pending", "Outbox record saved with status 'pending' during transaction");
  const pendingBefore = emailOutbox.getPendingEvents();
  assert(pendingBefore.some((e) => e.id === outboxEvent.id), "Pending outbox event listed in outbox store");

  const publishedCount = await emailOutbox.publishPending();
  assert(publishedCount >= 1, `Outbox worker published ${publishedCount} event(s) to background queue`);

  // --------------------------------------------------------------------------
  // 8. 5-Attempt Account Lockout Security Policy
  // --------------------------------------------------------------------------
  console.log("\n--- 8. 5-Attempt Account Lockout & Security Alerts ---");
  const targetEmail = "test-lockout-staff@orbinova.health";
  accountSecurity.unlockAccount(targetEmail);

  // Attempts 1 to 4: should fail but not lock
  for (let i = 1; i <= 4; i++) {
    const res = await accountSecurity.recordFailedAttempt(targetEmail);
    assert(!res.isLocked, `Attempt ${i}: Account remains unlocked (${res.remainingAttempts} remaining)`);
  }

  // 5th attempt: must lock out
  const fifthAttempt = await accountSecurity.recordFailedAttempt(targetEmail);
  assert(fifthAttempt.isLocked, "Attempt 5: Account is LOCKED OUT");
  assert(
    fifthAttempt.message.includes("Your account has been locked due to five unsuccessful login attempts"),
    "Lockout message matches clinical security specification exactly"
  );

  const isLockedNow = accountSecurity.isAccountLocked(targetEmail);
  assert(isLockedNow.isLocked, "isAccountLocked confirms account is locked");

  // Unlock / reset on successful login
  accountSecurity.recordSuccessfulLogin(targetEmail);
  assert(!accountSecurity.isAccountLocked(targetEmail).isLocked, "Successful authentication resets lockout state");

  // --------------------------------------------------------------------------
  // 9. Email Delivery Ledger & Webhook Updates
  // --------------------------------------------------------------------------
  console.log("\n--- 9. Delivery Ledger & Webhook Event Correlation ---");
  const ledgerEntries = emailDeliveryLedger.query({ limit: 5 });
  assert(ledgerEntries.length > 0, `Delivery ledger contains ${ledgerEntries.length} tracked records`);

  const sampleEntry = ledgerEntries[0];
  assert(!!sampleEntry.recipient, "Ledger records recipient email");
  assert(!!sampleEntry.category, "Ledger records email category");
  assert(!!sampleEntry.createdAt, "Ledger records creation timestamp");

  // Test webhook status transition to 'delivered'
  if (jobAfterRun?.providerMessageId) {
    const updated = emailDeliveryLedger.updateStatusByProviderMessageId(
      jobAfterRun.providerMessageId,
      "delivered"
    );
    assert(updated?.status === "delivered", "Webhook event updated ledger status to 'delivered'");
    assert(!!updated?.deliveredAt, "Delivery timestamp recorded upon webhook confirmation");
  }

  console.log("\n==============================================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==============================================================================");

  if (failedCount > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution aborted:", err);
  process.exit(1);
});
