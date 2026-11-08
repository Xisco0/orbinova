/**
 * ORBINOVA CENTRALIZED EMAIL CONFIGURATION
 * Enforces secure credentials & least-privilege provider adapters
 */

import { EmailProviderType } from "./types";

export interface EmailServiceConfig {
  provider: EmailProviderType;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
  };
  apiKeys?: {
    resend?: string;
    sendgrid?: string;
  };
  queue: {
    concurrency: number;
    maxAttempts: number;
    initialBackoffMs: number;
    maxBackoffMs: number;
    batchSize: number;
    pollIntervalMs: number;
  };
}

export function getEmailConfig(): EmailServiceConfig {
  // Provider resolution
  const envProvider = (process.env.EMAIL_PROVIDER || "").toLowerCase();
  let provider: EmailProviderType = "mock";

  if (envProvider === "resend" && (process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY)) {
    provider = "resend";
  } else if (envProvider === "sendgrid" && (process.env.EMAIL_API_KEY || process.env.SENDGRID_API_KEY)) {
    provider = "sendgrid";
  } else if (process.env.SMTP_HOST || envProvider === "smtp") {
    provider = "smtp";
  } else {
    // Default to mock in development if no SMTP or API key is set
    provider = process.env.NODE_ENV === "production" ? "smtp" : "mock";
  }

  // From Address & Identity
  const rawFrom =
    process.env.EMAIL_FROM_ADDRESS ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    "no-reply@orbinova.health";

  const emailMatch = rawFrom.match(/<([^>]+)>/);
  const fromAddress = emailMatch ? emailMatch[1].trim() : rawFrom.trim();

  const fromName = process.env.EMAIL_FROM_NAME || "ORBINOVA Healthcare Network";
  const replyTo = process.env.EMAIL_REPLY_TO || "support@orbinova.health";

  // SMTP Configuration
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const isPort465 = smtpPort === 465;

  return {
    provider,
    fromAddress,
    fromName,
    replyTo,
    smtp: {
      host: process.env.SMTP_HOST || "localhost",
      port: smtpPort,
      secure: isPort465,
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
    apiKeys: {
      resend: process.env.RESEND_API_KEY || (envProvider === "resend" ? process.env.EMAIL_API_KEY : undefined),
      sendgrid: process.env.SENDGRID_API_KEY || (envProvider === "sendgrid" ? process.env.EMAIL_API_KEY : undefined),
    },
    queue: {
      concurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY) || 3,
      maxAttempts: Number(process.env.EMAIL_MAX_ATTEMPTS) || 5,
      initialBackoffMs: Number(process.env.EMAIL_BACKOFF_INITIAL_MS) || 1000, // 1s
      maxBackoffMs: Number(process.env.EMAIL_BACKOFF_MAX_MS) || 60000, // 60s
      batchSize: Number(process.env.EMAIL_QUEUE_BATCH_SIZE) || 10,
      pollIntervalMs: Number(process.env.EMAIL_QUEUE_POLL_INTERVAL_MS) || 3000, // 3s
    },
  };
}

/**
 * Validates recipient email syntax according to RFC 5322
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  // RFC 5322 compliant regex
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return regex.test(trimmed);
}
