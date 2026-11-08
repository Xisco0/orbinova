/**
 * ORBINOVA PLUGGABLE EMAIL PROVIDER ADAPTER
 * Unifies SMTP, Resend, SendGrid, and Dev/Mock with Zero Frontend Exposure
 */

import nodemailer from "nodemailer";
import dns from "dns";
import { getEmailConfig, isValidEmail } from "./config";
import { EmailMessagePayload, EmailProviderType } from "./types";

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

export interface ProviderDispatchResult {
  success: boolean;
  provider: EmailProviderType;
  messageId?: string;
  error?: string;
  isPermanentError?: boolean;
}

export async function dispatchViaProvider(payload: EmailMessagePayload): Promise<ProviderDispatchResult> {
  const config = getEmailConfig();

  // Normalize primary recipient
  const rawRecipient = Array.isArray(payload.to) ? payload.to[0] : payload.to;
  const recipientEmail = typeof rawRecipient === "string" ? rawRecipient : rawRecipient.email;
  const recipientName = typeof rawRecipient === "string" ? undefined : rawRecipient.name;

  // 1. Strict RFC 5322 Pre-flight Check
  if (!isValidEmail(recipientEmail)) {
    return {
      success: false,
      provider: config.provider,
      error: `Invalid email address rejected by RFC 5322 validation: '${recipientEmail}'`,
      isPermanentError: true, // Permanent failure: never endlessly retry an invalid email
    };
  }

  const fromString = `"${payload.fromName || config.fromName}" <${config.fromAddress}>`;

  // --------------------------------------------------------------------------
  // Provider 1: Resend HTTP REST API
  // --------------------------------------------------------------------------
  if (config.provider === "resend" && config.apiKeys?.resend) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKeys.resend}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromString,
          to: [recipientEmail],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
          reply_to: payload.replyTo || config.replyTo,
          headers: payload.headers,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const isPerm = res.status === 400 || res.status === 422;
        return {
          success: false,
          provider: "resend",
          error: data.message || `Resend error HTTP ${res.status}`,
          isPermanentError: isPerm,
        };
      }

      return {
        success: true,
        provider: "resend",
        messageId: data.id || `resend-${Date.now()}`,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "resend",
        error: err.message || "Resend connection error",
        isPermanentError: false,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Provider 2: SendGrid HTTP REST API
  // --------------------------------------------------------------------------
  if (config.provider === "sendgrid" && config.apiKeys?.sendgrid) {
    try {
      const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKeys.sendgrid}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: recipientEmail, name: recipientName }],
              subject: payload.subject,
            },
          ],
          from: { email: config.fromAddress, name: payload.fromName || config.fromName },
          reply_to: { email: payload.replyTo || config.replyTo },
          content: [
            { type: "text/plain", value: payload.text || "" },
            { type: "text/html", value: payload.html },
          ],
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "");
        const isPerm = res.status === 400 || res.status === 403;
        return {
          success: false,
          provider: "sendgrid",
          error: `SendGrid error HTTP ${res.status}: ${errorBody}`,
          isPermanentError: isPerm,
        };
      }

      const msgId = res.headers.get("x-message-id") || `sendgrid-${Date.now()}`;
      return {
        success: true,
        provider: "sendgrid",
        messageId: msgId,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: "sendgrid",
        error: err.message || "SendGrid connection error",
        isPermanentError: false,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Provider 3: SMTP via Nodemailer
  // --------------------------------------------------------------------------
  if (config.provider === "smtp" && config.smtp?.host && config.smtp.user) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.pass || "",
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
      });

      const info = await transporter.sendMail({
        from: fromString,
        to: recipientEmail,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        replyTo: payload.replyTo || config.replyTo,
      });

      return {
        success: true,
        provider: "smtp",
        messageId: info.messageId,
      };
    } catch (err: any) {
      // SMTP 550, 551, 553, 554 are permanent mailbox errors
      const code = err.responseCode || 0;
      const isPerm = code >= 550 && code <= 559;
      return {
        success: false,
        provider: "smtp",
        error: err.message || "SMTP dispatch failed",
        isPermanentError: isPerm,
      };
    }
  }

  // --------------------------------------------------------------------------
  // Provider 4: Dev / Mock Fallback Transport
  // --------------------------------------------------------------------------
  const mockMsgId = `mock-msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log("==================================================================");
  console.log(`[ORBINOVA EMAIL DISPATCHED via MOCK/DEV]`);
  console.log(`To: ${recipientEmail} | Category: ${payload.category}`);
  console.log(`Subject: ${payload.subject}`);
  console.log(`MessageId: ${mockMsgId}`);
  console.log("==================================================================");

  return {
    success: true,
    provider: "mock",
    messageId: mockMsgId,
  };
}
