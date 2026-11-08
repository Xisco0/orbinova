import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import nodemailer from "nodemailer";
import fs from "fs";

// Simple env loader
const envContent = fs.readFileSync(".env.local", "utf-8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
}

async function main() {
  console.log("Checking credentials from .env.local...");
  console.log("Host:", envVars.SMTP_HOST);
  console.log("User:", envVars.SMTP_USER);

  // Note: Port 465 is blocked on this network, but Port 587 works!
  const port = 587;
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: port,
    secure: false, // 587 uses STARTTLS
    auth: {
      user: envVars.SMTP_USER,
      pass: envVars.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    const info = await transporter.sendMail({
      from: `"ORBINOVA Healthcare" <${envVars.SMTP_USER}>`,
      to: "francisbamirin45@gmail.com",
      subject: "ORBINOVA Healthcare: Verification & Account Activation",
      html: `
        <h2>Welcome to ORBINOVA Healthcare Network</h2>
        <p>Hello Dr. Francis Bamirin,</p>
        <p>Your institutional access to <strong>Lagos University Teaching Hospital (LUTH)</strong> has been activated.</p>
        <p><strong>Assigned Role:</strong> Doctor / Clinician</p>
        <p><strong>Default Password:</strong> <code>StaffPassword2026!</code></p>
        <p><strong>Portal URL:</strong> <a href="http://localhost:3000/login">http://localhost:3000/login</a></p>
        <hr/>
        <p style="font-size: 12px; color: #64748b;">This email was sent via verified live SMTP relay from ORBINOVA.</p>
      `,
    });
    console.log("SUCCESS! EMAIL SENT TO francisbamirin45@gmail.com!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
  } catch (err: any) {
    console.error("FAILED TO SEND:", err.message);
  }
}

main();
