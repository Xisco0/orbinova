/**
 * ORBINOVA REUSABLE EMAIL TEMPLATES & RESPONSIVE BRANDING ENGINE
 * Strict Clinical Compliance, Mobile Optimization, & Plain-Text Fallbacks
 */

import { EmailCategory } from "./types";

interface BaseTemplateOptions {
  title: string;
  category: EmailCategory;
  preheader?: string;
  contentHtml: string;
  contentText: string;
  actionButton?: {
    label: string;
    url: string;
  };
  footerNote?: string;
  showPreferencesLink?: boolean;
}

/**
 * Master ORBINOVA Responsive Email Layout
 */
export function renderMasterLayout(opts: BaseTemplateOptions): { html: string; text: string } {
  const year = new Date().getFullYear();
  const preheaderText = opts.preheader || opts.title;

  const html = `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${opts.title}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body { margin: 0; padding: 0; width: 100% !important; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f1f5f9; padding: 40px 0; }
    .main-table { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 36px; border-bottom: 3px solid #0d9488; }
    .brand-logo { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-decoration: none; margin: 0; }
    .brand-logo span { color: #14b8a6; }
    .brand-tagline { color: #94a3b8; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 6px; font-weight: 600; }
    .content { padding: 36px 36px 28px 36px; line-height: 1.6; color: #334155; font-size: 15px; }
    .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #0d9488; color: #ffffff !important; padding: 14px 32px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; text-align: center; box-shadow: 0 2px 4px rgba(13, 148, 136, 0.2); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-emergency { background-color: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }
    .badge-urgent { background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-success { background-color: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-info { background-color: #f0fdfa; color: #0f766e; border: 1px solid #ccfbf1; }
    .info-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #64748b; font-weight: 500; }
    .info-value { color: #0f172a; font-weight: 700; font-family: monospace; }
    .footer { background-color: #f8fafc; padding: 24px 36px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; line-height: 1.5; }
    .footer a { color: #0d9488; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .main-table { width: 100% !important; border-radius: 0 !important; }
      .header, .content, .footer { padding-left: 20px !important; padding-right: 20px !important; }
      .btn { width: 85% !important; display: block !important; margin: 20px auto !important; }
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">
    ${preheaderText} &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
  </div>
  <table role="presentation" class="wrapper" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" class="main-table" width="100%" cellpadding="0" cellspacing="0" border="0">
          <!-- Header -->
          <tr>
            <td class="header">
              <div class="brand-logo">ORBI<span>NOVA</span></div>
              <div class="brand-tagline">Healthcare Intelligence &amp; Blood Coordination Network</div>
            </td>
          </tr>
          <!-- Content Body -->
          <tr>
            <td class="content">
              ${opts.contentHtml}

              ${
                opts.actionButton
                  ? `
              <div class="btn-container">
                <a href="${opts.actionButton.url}" class="btn" target="_blank" rel="noopener noreferrer">${opts.actionButton.label}</a>
              </div>
              `
                  : ""
              }

              ${
                opts.footerNote
                  ? `<p style="font-size: 12px; color: #64748b; margin-top: 28px; line-height: 1.5;">${opts.footerNote}</p>`
                  : ""
              }
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin: 0 0 8px 0;">
                &copy; ${year} ORBINOVA Technologies Inc. All rights reserved.
              </p>
              <p style="margin: 0 0 8px 0;">
                Confidential Healthcare Communication &bull; Transmitted under strict data protection regulations.
              </p>
              ${
                opts.showPreferencesLink
                  ? `<p style="margin: 8px 0 0 0;"><a href="https://orbinova.health/preferences">Manage Notification Preferences</a> &bull; <a href="https://orbinova.health/privacy">Privacy Policy</a></p>`
                  : ""
              }
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // Plain-text alternative
  const text = `
ORBINOVA HEALTHCARE NETWORK
--------------------------------------------------
${opts.title.toUpperCase()}
--------------------------------------------------

${opts.contentText.trim()}

${opts.actionButton ? `>> ${opts.actionButton.label}: ${opts.actionButton.url}\n` : ""}
${opts.footerNote ? `Note: ${opts.footerNote}\n` : ""}
--------------------------------------------------
(c) ${year} ORBINOVA Technologies Inc. Confidential clinical communication.
`.trim();

  return { html, text };
}

// ============================================================================
// 1. AUTHENTICATION & ACCOUNT TEMPLATES
// ============================================================================

export function renderStaffInvitationEmail(params: {
  fullName?: string;
  roleLabel: string;
  organizationName: string;
  invitationUrl: string;
  defaultPassword?: string;
  expiresInDays?: number;
}): { html: string; text: string; subject: string } {
  const name = params.fullName?.trim() || "Healthcare Professional";
  const days = params.expiresInDays || 7;
  const subject = `Official Invitation: Join ${params.organizationName} on ORBINOVA`;

  const contentHtml = `
    <h2 class="greeting">Welcome to the Team, ${name}</h2>
    <p>
      You have been invited by the administration of <strong>${params.organizationName}</strong> to join the ORBINOVA connected healthcare network.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Healthcare Institution:</span>
        <span class="info-value">${params.organizationName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Assigned Clinical Role:</span>
        <span class="info-value" style="color: #0d9488;">${params.roleLabel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Invitation Expiry:</span>
        <span class="info-value">${days} Days</span>
      </div>
    </div>

    <p style="font-size: 14px; color: #475569;">
      Please click below to activate your professional profile and securely configure your clinical access credentials.
    </p>
  `;

  const contentText = `
Hello ${name},

You have been invited by the administration of ${params.organizationName} to join the ORBINOVA connected healthcare network as an authorized ${params.roleLabel}.

Your secure invitation is valid for ${days} days. Please activate your account at the link below.
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "auth",
    preheader: `You have been invited to join ${params.organizationName} on ORBINOVA`,
    contentHtml,
    contentText,
    actionButton: {
      label: "Accept Invitation & Activate Account",
      url: params.invitationUrl,
    },
    footerNote: "Security Notice: For patient safety and privacy, never share your invitation link. ORBINOVA will never ask for your password via email.",
  });

  return { html, text, subject };
}

export function renderDonorWelcomeEmail(params: {
  toEmail: string;
  fullName?: string;
  bloodGroup: string;
  organizationName: string;
  loginUrl: string;
  defaultPassword?: string;
}): { html: string; text: string; subject: string } {
  const name = params.fullName?.trim() || "Voluntary Donor";
  const isLinked = !params.defaultPassword;
  const defaultPassword = params.defaultPassword || "DonorPassword2026!";
  const subject = isLinked
    ? `Your ORBINOVA Voluntary Donor Profile is Active`
    : `Welcome to ORBINOVA Blood Donor Network — Your Login Credentials`;

  const credentialSectionHtml = isLinked
    ? `<div class="info-row" style="background-color: #eff6ff; padding: 10px 14px; border-radius: 8px; margin-top: 10px; border: 1px solid #bfdbfe;">
        <span class="info-label" style="color: #1e40af; font-weight: bold;">Account Login:</span>
        <span class="info-value" style="color: #1e3a8a; font-weight: 600;">Linked to your existing ORBINOVA account. Use your existing password to log in.</span>
      </div>`
    : `<div class="info-row" style="background-color: #f1f5f9; padding: 10px 14px; border-radius: 8px; margin-top: 10px; border: 1px dashed #cbd5e1;">
        <span class="info-label" style="color: #0f172a; font-weight: bold;">Default Password:</span>
        <span class="info-value" style="font-family: monospace; font-size: 15px; font-weight: bold; color: #dc2626;">${defaultPassword}</span>
      </div>`;

  const contentHtml = `
    <h2 class="greeting">Welcome to ORBINOVA, ${name}!</h2>
    <p>
      Thank you for registering as a voluntary life-saving blood donor with <strong>${params.organizationName}</strong>. Your donor profile is now active on the ORBINOVA Healthcare Network.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Registering Facility:</span>
        <span class="info-value">${params.organizationName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Blood Group:</span>
        <span class="info-value" style="color: #dc2626; font-weight: bold;">${params.bloodGroup}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Donor Portal Login:</span>
        <span class="info-value" style="font-family: monospace;">${params.toEmail}</span>
      </div>
      ${credentialSectionHtml}
    </div>

    <p style="font-size: 14px; color: #475569; margin-top: 16px;">
      You can now log into your personal <strong>Donor Portal</strong> to view urgent blood donation requests near you, track your donation history, update your availability, and earn life-saver badges.
    </p>
  `;

  const contentText = isLinked
    ? `
Hello ${name},

Thank you for registering as a voluntary blood donor with ${params.organizationName}.

Your donor profile has been created with blood group ${params.bloodGroup}.
Your donor profile is linked to your existing ORBINOVA healthcare account.

Log into your Donor Portal using your existing email (${params.toEmail}) and password at:
${params.loginUrl}

Through your portal, you can view emergency requests, manage your availability, and track your life-saving donations.
`
    : `
Hello ${name},

Thank you for registering as a voluntary blood donor with ${params.organizationName}.

Your donor profile has been created with blood group ${params.bloodGroup}.

Your login credentials for the Donor Portal:
- Portal Login Email: ${params.toEmail}
- Default Password: ${defaultPassword}

Log into your Donor Portal at:
${params.loginUrl}

Through your portal, you can view emergency requests, manage your availability, and track your life-saving donations.
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "auth",
    preheader: `Your ORBINOVA Voluntary Donor account is active — login details enclosed`,
    contentHtml,
    contentText,
    actionButton: {
      label: "Access Donor Portal",
      url: params.loginUrl,
    },
    footerNote: "You are receiving this email because you registered as a voluntary blood donor at an ORBINOVA-affiliated hospital. For account security, please change your default password after your first sign in.",
  });

  return { html, text, subject };
}

export function renderEmailVerificationEmail(params: {
  fullName?: string;
  verificationUrl: string;
  expiresInHours?: number;
}): { html: string; text: string; subject: string } {
  const name = params.fullName?.trim() || "Healthcare User";
  const hours = params.expiresInHours || 24;
  const subject = "Verify Your ORBINOVA Account Email Address";

  const contentHtml = `
    <h2 class="greeting">Verify Your Email Address</h2>
    <p>
      Thank you for registering on ORBINOVA. To complete your account setup and ensure institutional security, please verify your email address.
    </p>

    <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 16px; margin: 24px 0; color: #0f766e; font-size: 13px;">
      <strong>Security Verification:</strong> This single-use link expires in <strong>${hours} hours</strong>. If you did not create an account on ORBINOVA, you can safely disregard this message.
    </div>
  `;

  const contentText = `
Hello ${name},

Please verify your email address on ORBINOVA. This single-use link is valid for ${hours} hours.
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "auth",
    contentHtml,
    contentText,
    actionButton: {
      label: "Verify Email Address",
      url: params.verificationUrl,
    },
  });

  return { html, text, subject };
}

export function renderPasswordResetEmail(params: {
  fullName?: string;
  resetUrl: string;
  expiresInMinutes?: number;
}): { html: string; text: string; subject: string } {
  const name = params.fullName?.trim() || "Healthcare User";
  const mins = params.expiresInMinutes || 60;
  const subject = "Reset Your ORBINOVA Password";

  const contentHtml = `
    <h2 class="greeting">Password Reset Request</h2>
    <p>
      We received a request to reset the password for your ORBINOVA account. Click the button below to establish a new password.
    </p>

    <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 24px 0; color: #92400e; font-size: 13px;">
      <strong>Security Notice:</strong> This link is single-use and will expire in <strong>${mins} minutes</strong>. If you did not request this change, please contact your institution administrator immediately.
    </div>
  `;

  const contentText = `
Hello ${name},

A password reset was requested for your account. This link expires in ${mins} minutes.
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "auth",
    contentHtml,
    contentText,
    actionButton: {
      label: "Reset Password",
      url: params.resetUrl,
    },
    footerNote: "If you did not initiate this request, your account remains secure. No changes have been made.",
  });

  return { html, text, subject };
}

export function renderAccountLockoutEmail(params: {
  fullName?: string;
  email: string;
  lockoutReason?: string;
  adminContactEmail?: string;
}): { html: string; text: string; subject: string } {
  const name = params.fullName?.trim() || "Healthcare Specialist";
  const subject = "Security Alert: ORBINOVA Account Temporarily Locked";
  const adminContact = params.adminContactEmail || "support@orbinova.health";

  const contentHtml = `
    <h2 class="greeting" style="color: #b91c1c;">Account Temporarily Locked</h2>
    <p>
      Your account (<strong>${params.email}</strong>) has been locked due to <strong>five consecutive unsuccessful login attempts</strong>.
    </p>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 18px; margin: 24px 0; color: #991b1b; font-size: 13px; line-height: 1.6;">
      <strong>Institutional Security Enforcement:</strong><br />
      This security measure prevents unauthorized access to sensitive healthcare records. Your credentials will remain disabled until unlocked by an authorized institution administrator or via verified recovery.
    </div>

    <p style="font-size: 14px; color: #475569;">
      <strong>What should you do?</strong><br />
      Please contact your facility administrator or write to <strong>${adminContact}</strong> to request account unlock assistance.
    </p>
  `;

  const contentText = `
SECURITY ALERT: ACCOUNT LOCKED
Hello ${name},
Your account (${params.email}) has been locked due to 5 consecutive unsuccessful login attempts.
Please contact your facility administrator or write to ${adminContact} for assistance.
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "security",
    contentHtml,
    contentText,
    footerNote: "ORBINOVA Security Automated Monitor &bull; Incident logged for regulatory compliance.",
  });

  return { html, text, subject };
}

export function renderPasswordChangedEmail(params: {
  fullName?: string;
  email: string;
  timestamp: string;
}): { html: string; text: string; subject: string } {
  const name = params.fullName?.trim() || "Healthcare User";
  const subject = "Security Notification: ORBINOVA Password Changed";

  const contentHtml = `
    <h2 class="greeting">Your Password Was Updated</h2>
    <p>
      The password for your ORBINOVA account (<strong>${params.email}</strong>) was changed successfully on <strong>${params.timestamp}</strong>.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 24px 0; color: #475569; font-size: 13px;">
      If you performed this action, no further steps are required. If you did not make this change, please report this incident immediately to your facility administrator.
    </div>
  `;

  const contentText = `
Hello ${name},
Your password was successfully updated on ${params.timestamp}. If you did not authorize this change, contact your security administrator immediately.
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "security",
    contentHtml,
    contentText,
  });

  return { html, text, subject };
}

// ============================================================================
// 2. INSTITUTIONAL STATUS NOTIFICATIONS
// ============================================================================

export function renderInstitutionStatusEmail(params: {
  institutionName: string;
  institutionType: "hospital" | "blood_bank";
  newStatus: "verified" | "rejected" | "suspended" | "pending";
  reviewerNotes?: string;
  portalUrl: string;
}): { html: string; text: string; subject: string } {
  const typeLabel = params.institutionType === "hospital" ? "Hospital" : "Blood Bank Organization";
  let statusBadge = "";
  let subject = "";

  if (params.newStatus === "verified") {
    subject = `Institution Approved: ${params.institutionName} is Verified on ORBINOVA`;
    statusBadge = `<span class="badge badge-success">Approved &bull; Verified</span>`;
  } else if (params.newStatus === "suspended") {
    subject = `URGENT: ${params.institutionName} Institutional Clearance Suspended`;
    statusBadge = `<span class="badge badge-emergency">Suspended</span>`;
  } else if (params.newStatus === "rejected") {
    subject = `Application Decision: ${params.institutionName} Onboarding`;
    statusBadge = `<span class="badge badge-emergency">Not Approved</span>`;
  } else {
    subject = `Application Received: ${params.institutionName} Pending Review`;
    statusBadge = `<span class="badge badge-info">Under Review</span>`;
  }

  const contentHtml = `
    <h2 class="greeting">Institutional Status Update</h2>
    <p>
      This is an official communication regarding the registration status of <strong>${params.institutionName}</strong> (${typeLabel}) on the ORBINOVA clinical platform.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Facility Name:</span>
        <span class="info-value">${params.institutionName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Facility Classification:</span>
        <span class="info-value">${typeLabel}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Verification Status:</span>
        <span class="info-value">${statusBadge}</span>
      </div>
      ${
        params.reviewerNotes
          ? `
      <div class="info-row" style="flex-direction: column; gap: 4px;">
        <span class="info-label">Administrative Notes:</span>
        <span style="font-size: 13px; color: #334155; font-style: italic;">"${params.reviewerNotes}"</span>
      </div>
      `
          : ""
      }
    </div>
  `;

  const contentText = `
INSTITUTIONAL STATUS UPDATE: ${params.institutionName}
Classification: ${typeLabel}
Status: ${params.newStatus.toUpperCase()}
${params.reviewerNotes ? `Notes: ${params.reviewerNotes}` : ""}
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "institution",
    contentHtml,
    contentText,
    actionButton: {
      label: "Access Institutional Portal",
      url: params.portalUrl,
    },
  });

  return { html, text, subject };
}

// ============================================================================
// 3. BLOOD REQUEST NOTIFICATIONS
// ============================================================================

export function renderBloodRequestBroadcastEmail(params: {
  hospitalName: string;
  requestId: string;
  bloodGroup: string;
  unitsRequired: number;
  urgency: "emergency" | "urgent" | "normal";
  requiredBy?: string | null;
  clinicalNotes?: string | null;
  reviewUrl: string;
}): { html: string; text: string; subject: string } {
  const isEmergency = params.urgency === "emergency";
  const urgencyBadge = isEmergency
    ? `<span class="badge badge-emergency">EMERGENCY (LEVEL 1)</span>`
    : params.urgency === "urgent"
    ? `<span class="badge badge-urgent">URGENT (LEVEL 2)</span>`
    : `<span class="badge badge-info">ROUTINE (LEVEL 3)</span>`;

  const subject = `${isEmergency ? "🚨 CRITICAL BROADCAST: " : "Blood Request: "}Need ${params.unitsRequired} Units ${params.bloodGroup} at ${params.hospitalName}`;

  const contentHtml = `
    <h2 class="greeting">Incoming Blood Supply Request</h2>
    <p>
      An authorized clinical request has been broadcast by <strong>${params.hospitalName}</strong> requiring compatible stock allocation.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Urgency Level:</span>
        <span class="info-value">${urgencyBadge}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Required Blood Group:</span>
        <span class="info-value" style="font-size: 16px; color: #b91c1c;">${params.bloodGroup}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Units Needed:</span>
        <span class="info-value">${params.unitsRequired} Bags (450ml)</span>
      </div>
      <div class="info-row">
        <span class="info-label">Requesting Hospital:</span>
        <span class="info-value">${params.hospitalName}</span>
      </div>
      ${
        params.requiredBy
          ? `
      <div class="info-row">
        <span class="info-label">Required By:</span>
        <span class="info-value">${new Date(params.requiredBy).toLocaleString()}</span>
      </div>
      `
          : ""
      }
      ${
        params.clinicalNotes
          ? `
      <div class="info-row" style="flex-direction: column; gap: 4px;">
        <span class="info-label">Clinical Indication:</span>
        <span style="font-size: 13px; color: #334155;">"${params.clinicalNotes}"</span>
      </div>
      `
          : ""
      }
    </div>

    <p style="font-size: 14px; color: #475569;">
      Please inspect your facility stock ledger and confirm unit allocation or reservation immediately.
    </p>
  `;

  const contentText = `
BLOOD SUPPLY BROADCAST: ${params.urgency.toUpperCase()}
Hospital: ${params.hospitalName}
Blood Group: ${params.bloodGroup} | Units: ${params.unitsRequired}
Required By: ${params.requiredBy || "Immediate"}
Review & Respond: ${params.reviewUrl}
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "blood_requests",
    contentHtml,
    contentText,
    actionButton: {
      label: "Review & Allocate Stock",
      url: params.reviewUrl,
    },
    footerNote: "Clinical Coordination Notice &bull; All transactions recorded in immutable audit ledger.",
  });

  return { html, text, subject };
}

export function renderBloodRequestFulfillmentEmail(params: {
  hospitalName: string;
  bloodBankName: string;
  requestId: string;
  bloodGroup: string;
  status: "accepted" | "rejected" | "partially_fulfilled" | "completed";
  allocatedUnits?: number;
  totalRequiredUnits?: number;
  portalUrl: string;
}): { html: string; text: string; subject: string } {
  let subject = "";
  let badge = "";

  if (params.status === "accepted" || params.status === "completed") {
    subject = `Blood Request Fulfilled: ${params.bloodBankName} allocated ${params.allocatedUnits || ""} units of ${params.bloodGroup}`;
    badge = `<span class="badge badge-success">Fulfilled / Accepted</span>`;
  } else if (params.status === "partially_fulfilled") {
    subject = `Partial Fulfillment: ${params.allocatedUnits} of ${params.totalRequiredUnits} units allocated by ${params.bloodBankName}`;
    badge = `<span class="badge badge-urgent">Partially Fulfilled</span>`;
  } else {
    subject = `Request Update: Stock unavailable at ${params.bloodBankName}`;
    badge = `<span class="badge badge-emergency">Unavailable</span>`;
  }

  const contentHtml = `
    <h2 class="greeting">Blood Request Fulfillment Update</h2>
    <p>
      An operational response has been logged by <strong>${params.bloodBankName}</strong> for request <code>${params.requestId}</code>.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Fulfillment Status:</span>
        <span class="info-value">${badge}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Supplying Facility:</span>
        <span class="info-value">${params.bloodBankName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Blood Group:</span>
        <span class="info-value">${params.bloodGroup}</span>
      </div>
      ${
        params.allocatedUnits !== undefined
          ? `
      <div class="info-row">
        <span class="info-label">Allocated Units:</span>
        <span class="info-value" style="color: #0d9488;">${params.allocatedUnits} Units</span>
      </div>
      `
          : ""
      }
    </div>
  `;

  const contentText = `
BLOOD REQUEST STATUS: ${params.status.toUpperCase()}
Supplying Facility: ${params.bloodBankName}
Blood Group: ${params.bloodGroup} | Allocated: ${params.allocatedUnits || 0}
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "blood_requests",
    contentHtml,
    contentText,
    actionButton: {
      label: "View Request in Hospital Portal",
      url: params.portalUrl,
    },
  });

  return { html, text, subject };
}

// ============================================================================
// 4. DONOR MATCH NOTIFICATIONS
// ============================================================================

export function renderDonorMatchNotificationEmail(params: {
  donorName: string;
  hospitalName: string;
  bloodGroup: string;
  urgency: "emergency" | "urgent" | "normal";
  city?: string;
  responseUrl: string;
}): { html: string; text: string; subject: string } {
  const isEmergency = params.urgency === "emergency";
  const subject = `${isEmergency ? "🚨 URGENT HERO CALL: " : "Blood Donation Opportunity: "}Matching Need for Group ${params.bloodGroup}`;

  const contentHtml = `
    <h2 class="greeting">You Can Help Save a Life, ${params.donorName}</h2>
    <p>
      A verified hospital nearby (<strong>${params.hospitalName}</strong>) has an immediate shortage of your blood group (<strong>${params.bloodGroup}</strong>).
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Matching Blood Group:</span>
        <span class="info-value" style="color: #b91c1c; font-size: 16px;">${params.bloodGroup}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Hospital Location:</span>
        <span class="info-value">${params.hospitalName}${params.city ? ` (${params.city})` : ""}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Clinical Need:</span>
        <span class="info-value">${isEmergency ? "Critical Life-Threat" : "Urgent Patient Care"}</span>
      </div>
    </div>

    <div style="background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #0f766e;">
      <strong>Donor Confidentiality Notice:</strong> Patient identities are strictly protected. Expressing interest does not obligate you and all donations are voluntary following rapid clinical pre-screening at the facility.
    </div>
  `;

  const contentText = `
HERO DONOR CALL: Group ${params.bloodGroup} needed at ${params.hospitalName}
Priority: ${params.urgency.toUpperCase()}
Respond here: ${params.responseUrl}
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "donors",
    contentHtml,
    contentText,
    actionButton: {
      label: "View Request & Confirm Availability",
      url: params.responseUrl,
    },
    showPreferencesLink: true,
  });

  return { html, text, subject };
}

// ============================================================================
// 5. INVENTORY & RESERVATION ALERTS
// ============================================================================

export function renderInventoryAlertEmail(params: {
  facilityName: string;
  alertType: "low_stock" | "near_expiry" | "expired_quarantine";
  bloodGroup: string;
  currentUnits: number;
  thresholdUnits?: number;
  inventoryUrl: string;
}): { html: string; text: string; subject: string } {
  let subject = "";
  let badge = "";

  if (params.alertType === "low_stock") {
    subject = `INVENTORY ALERT: Low Stock Warning for Group ${params.bloodGroup} (${params.currentUnits} Units Left)`;
    badge = `<span class="badge badge-emergency">Low Stock Alert</span>`;
  } else if (params.alertType === "near_expiry") {
    subject = `EXPIRY WARNING: Group ${params.bloodGroup} Units Approaching Expiration`;
    badge = `<span class="badge badge-urgent">Near Expiry</span>`;
  } else {
    subject = `QUALITY AUDIT: Expired Units Require Quarantine &mdash; Group ${params.bloodGroup}`;
    badge = `<span class="badge badge-emergency">Action Required</span>`;
  }

  const contentHtml = `
    <h2 class="greeting">Inventory Stock Alert</h2>
    <p>
      An automated threshold monitor at <strong>${params.facilityName}</strong> has triggered an operational alert.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Alert Category:</span>
        <span class="info-value">${badge}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Blood Group:</span>
        <span class="info-value" style="color: #b91c1c; font-size: 16px;">${params.bloodGroup}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Current Quantity:</span>
        <span class="info-value">${params.currentUnits} Bags</span>
      </div>
      ${
        params.thresholdUnits !== undefined
          ? `
      <div class="info-row">
        <span class="info-label">Configured Threshold:</span>
        <span class="info-value">${params.thresholdUnits} Bags</span>
      </div>
      `
          : ""
      }
    </div>
  `;

  const contentText = `
INVENTORY ALERT: ${params.alertType.toUpperCase()}
Facility: ${params.facilityName}
Blood Group: ${params.bloodGroup} | Current Units: ${params.currentUnits}
Manage: ${params.inventoryUrl}
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "inventory",
    contentHtml,
    contentText,
    actionButton: {
      label: "Open Stock Management Ledger",
      url: params.inventoryUrl,
    },
    footerNote: "Automated Clinical Logistics Engine &bull; Only authorized inventory managers receive this notification.",
  });

  return { html, text, subject };
}

export function renderReservationConfirmationEmail(params: {
  facilityName: string;
  reservationId: string;
  bloodGroup: string;
  units: number;
  status: "created" | "accepted" | "cancelled" | "released" | "completed";
  portalUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `Blood Reservation ${params.status.toUpperCase()}: ${params.units} Units of ${params.bloodGroup}`;

  const contentHtml = `
    <h2 class="greeting">Reservation Transaction Ledger</h2>
    <p>
      A reservation transaction for <strong>${params.facilityName}</strong> has been committed to the ledger.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Reservation Reference:</span>
        <span class="info-value">${params.reservationId}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Transaction Status:</span>
        <span class="info-value" style="color: #0d9488; text-transform: uppercase;">${params.status}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Blood Group:</span>
        <span class="info-value">${params.bloodGroup}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Units Allocated:</span>
        <span class="info-value">${params.units} Bags</span>
      </div>
    </div>
  `;

  const contentText = `
RESERVATION UPDATE: ${params.reservationId}
Status: ${params.status.toUpperCase()}
Group: ${params.bloodGroup} | Units: ${params.units}
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "reservations",
    contentHtml,
    contentText,
    actionButton: {
      label: "Inspect Reservation Details",
      url: params.portalUrl,
    },
  });

  return { html, text, subject };
}


/**
 * Donor Screening Appointment Scheduled Email (ASAP & Scheduled)
 */
export function renderDonorScreeningScheduledEmail(params: {
  donorName: string;
  hospitalName: string;
  bloodRequestRef: string;
  bloodGroup: string;
  screeningType: "asap" | "scheduled";
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  hospitalAddress: string;
  instructions?: string | null;
  portalUrl: string;
}): { html: string; text: string; subject: string } {
  const isAsap = params.screeningType === "asap";
  const subject = isAsap
    ? `Action Required: Immediate Donor Screening Requested by ${params.hospitalName}`
    : `Donor Screening Scheduled: ${params.scheduledDate} at ${params.hospitalName}`;

  const contentHtml = `
    <h2 class="greeting">Hello, ${params.donorName}!</h2>
    <p>
      Thank you for confirming your interest in blood request <strong>${params.bloodRequestRef}</strong>. 
      <strong>${params.hospitalName}</strong> has reviewed your candidate match and arranged your pre-donation health screening.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Screening Arrangement:</span>
        <span class="info-value" style="color: ${isAsap ? "#b91c1c" : "#0d9488"}; text-transform: uppercase;">
          ${isAsap ? "Immediate (ASAP)" : "Scheduled Appointment"}
        </span>
      </div>
      ${
        !isAsap && params.scheduledDate
          ? `
      <div class="info-row">
        <span class="info-label">Appointment Date:</span>
        <span class="info-value">${params.scheduledDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Appointment Time:</span>
        <span class="info-value">${params.scheduledTime || "As agreed"}</span>
      </div>
      `
          : ""
      }
      <div class="info-row">
        <span class="info-label">Screening Facility:</span>
        <span class="info-value">${params.hospitalName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Facility Address:</span>
        <span class="info-value">${params.hospitalAddress}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Requested Blood Group:</span>
        <span class="info-value">${params.bloodGroup}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Request Reference:</span>
        <span class="info-value">${params.bloodRequestRef}</span>
      </div>
    </div>

    ${
      isAsap
        ? `
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #991b1b;">
      <strong>⚠️ Immediate Screening Request:</strong> The hospital urgently requests that you attend the screening facility <strong>as soon as possible</strong>. Please log in to your donor portal to confirm your availability or let the facility know if you cannot attend.
    </div>
    `
        : `
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #166534;">
      <strong>📅 Scheduled Appointment:</strong> Please arrive promptly at <strong>${params.hospitalName}</strong> on <strong>${params.scheduledDate} at ${params.scheduledTime || "the scheduled time"}</strong>. Please confirm your attendance in your donor dashboard.
    </div>
    `
    }

    ${
      params.instructions
        ? `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px;">
      <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Special Instructions from Facility:</strong>
      <p style="margin: 0; color: #475569;">${params.instructions}</p>
    </div>
    `
        : ""
    }

    <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
      Important Note: Screening confirms your current physiological suitability before donation. If your schedule changes, you can easily request rescheduling directly from your donor dashboard.
    </p>
  `;

  const contentText = `
Hello, ${params.donorName}!

${params.hospitalName} has arranged your pre-donation health screening for Blood Request ${params.bloodRequestRef}.

Screening Type: ${isAsap ? "Immediate (ASAP)" : "Scheduled Appointment"}
${!isAsap ? `Date: ${params.scheduledDate} at ${params.scheduledTime || "As agreed"}\n` : ""}
Facility: ${params.hospitalName}
Address: ${params.hospitalAddress}
Blood Group: ${params.bloodGroup}

${
  isAsap
    ? "The hospital requests that you attend as soon as possible. Please confirm your availability."
    : `Please attend on ${params.scheduledDate} at ${params.scheduledTime}.`
}

${params.instructions ? `Instructions: ${params.instructions}\n` : ""}

Confirm your attendance: ${params.portalUrl}
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "donors",
    contentHtml,
    contentText,
    actionButton: {
      label: isAsap ? "Confirm Availability" : "Confirm Attendance",
      url: params.portalUrl,
    },
    footerNote: "Automated Clinical Coordination Engine &bull; Zero patient health disclosure protected.",
  });

  return { html, text, subject };
}

/**
 * Donor Screening Appointment Rescheduled Email
 */
export function renderDonorScreeningRescheduledEmail(params: {
  donorName: string;
  hospitalName: string;
  bloodRequestRef: string;
  newDate?: string | null;
  newTime?: string | null;
  screeningType: "asap" | "scheduled";
  hospitalAddress: string;
  instructions?: string | null;
  portalUrl: string;
}): { html: string; text: string; subject: string } {
  const isAsap = params.screeningType === "asap";
  const subject = `Screening Rescheduled: ${params.hospitalName} (Request ${params.bloodRequestRef})`;

  const contentHtml = `
    <h2 class="greeting">Screening Appointment Rescheduled</h2>
    <p>
      Dear ${params.donorName}, your screening arrangement at <strong>${params.hospitalName}</strong> for request <strong>${params.bloodRequestRef}</strong> has been updated.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">New Arrangement:</span>
        <span class="info-value" style="color: #0d9488; text-transform: uppercase;">
          ${isAsap ? "Immediate (ASAP)" : "Updated Scheduled Appointment"}
        </span>
      </div>
      ${
        !isAsap && params.newDate
          ? `
      <div class="info-row">
        <span class="info-label">New Appointment Date:</span>
        <span class="info-value">${params.newDate}</span>
      </div>
      <div class="info-row">
        <span class="info-label">New Appointment Time:</span>
        <span class="info-value">${params.newTime || "Scheduled time"}</span>
      </div>
      `
          : ""
      }
      <div class="info-row">
        <span class="info-label">Facility Address:</span>
        <span class="info-value">${params.hospitalAddress}</span>
      </div>
    </div>

    ${
      params.instructions
        ? `
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin: 20px 0; font-size: 13px;">
      <strong style="color: #0f172a; display: block; margin-bottom: 4px;">Updated Facility Instructions:</strong>
      <p style="margin: 0; color: #475569;">${params.instructions}</p>
    </div>
    `
        : ""
    }

    <p style="font-size: 13px; color: #64748b;">
      Please review the updated arrangement on your donor dashboard and confirm if the new timing works for you.
    </p>
  `;

  const contentText = `
Screening Rescheduled at ${params.hospitalName}
Request: ${params.bloodRequestRef}
${!isAsap ? `New Date: ${params.newDate} at ${params.newTime}\n` : "Arrangement: Immediate Screening (ASAP)\n"}
Address: ${params.hospitalAddress}

Review and confirm: ${params.portalUrl}
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "donors",
    contentHtml,
    contentText,
    actionButton: {
      label: "Review & Confirm New Schedule",
      url: params.portalUrl,
    },
    footerNote: "Automated Clinical Coordination Engine &bull; Privacy protected.",
  });

  return { html, text, subject };
}

/**
 * Donor Screening Appointment Cancelled Email
 */
export function renderDonorScreeningCancelledEmail(params: {
  donorName: string;
  hospitalName: string;
  bloodRequestRef: string;
  reason?: string | null;
  portalUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `Screening Arrangement Cancelled: ${params.hospitalName}`;

  const contentHtml = `
    <h2 class="greeting">Screening Arrangement Cancelled</h2>
    <p>
      Dear ${params.donorName}, the screening appointment at <strong>${params.hospitalName}</strong> for Request <strong>${params.bloodRequestRef}</strong> has been cancelled.
    </p>

    <div class="info-card">
      <div class="info-row">
        <span class="info-label">Facility:</span>
        <span class="info-value">${params.hospitalName}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Request Reference:</span>
        <span class="info-value">${params.bloodRequestRef}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Cancellation Status:</span>
        <span class="info-value" style="color: #b91c1c;">CANCELLED</span>
      </div>
      ${
        params.reason
          ? `
      <div class="info-row">
        <span class="info-label">Reason:</span>
        <span class="info-value">${params.reason}</span>
      </div>
      `
          : ""
      }
    </div>

    <p style="font-size: 14px; color: #334155;">
      Thank you sincerely for your willingness to donate and save lives. You do not need to attend this screening session. Your donor availability remains active for future matching requests.
    </p>
  `;

  const contentText = `
Screening Arrangement Cancelled at ${params.hospitalName}
Request: ${params.bloodRequestRef}
Status: CANCELLED
${params.reason ? `Reason: ${params.reason}\n` : ""}

Thank you for your willingness to donate!
`;

  const { html, text } = renderMasterLayout({
    title: subject,
    category: "donors",
    contentHtml,
    contentText,
    actionButton: {
      label: "Open Donor Dashboard",
      url: params.portalUrl,
    },
    footerNote: "Automated Clinical Coordination Engine.",
  });

  return { html, text, subject };
}
