/**
 * ORBINOVA ENTERPRISE EMAIL & BACKGROUND QUEUE TYPE DEFINITIONS
 */

export type EmailCategory =
  | "auth"
  | "account"
  | "institution"
  | "blood_requests"
  | "donors"
  | "reservations"
  | "inventory"
  | "security";

export type EmailDeliveryStatus =
  | "queued"
  | "processing"
  | "sent"
  | "delivered"
  | "failed"
  | "permanently_failed";

export type EmailProviderType = "smtp" | "resend" | "sendgrid" | "mock" | "log";

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer;
  contentType?: string;
}

export interface EmailMessagePayload {
  to: string | EmailRecipient | (string | EmailRecipient)[];
  subject: string;
  html: string;
  text?: string;
  category: EmailCategory;
  fromName?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  metadata?: {
    userId?: string;
    organizationId?: string;
    referenceId?: string;
    referenceType?: string;
    idempotencyKey?: string;
    [key: string]: any;
  };
}

export interface EmailJob {
  id: string;
  idempotencyKey: string;
  category: EmailCategory;
  payload: EmailMessagePayload;
  status: EmailDeliveryStatus;
  attempts: number;
  maxAttempts: number;
  nextRunAt: number; // Unix timestamp ms
  createdAt: string;
  updatedAt: string;
  lastAttemptAt?: string;
  provider?: EmailProviderType;
  providerMessageId?: string;
  failureReason?: string;
  deliveredAt?: string;
}

export interface EmailDeliveryRecord {
  id: string;
  jobId: string;
  idempotencyKey: string;
  recipient: string;
  recipientName?: string;
  category: EmailCategory;
  subject: string;
  institutionId?: string;
  userId?: string;
  referenceId?: string;
  referenceType?: string;
  status: EmailDeliveryStatus;
  provider: EmailProviderType;
  providerMessageId?: string;
  attempts: number;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export interface UserEmailPreferences {
  userId: string;
  email: string;
  donorOpportunities: boolean;
  operationalUpdates: boolean;
  inventoryDigest: boolean;
  generalAnnouncements: boolean;
  updatedAt: string;
}

export interface EmailSendResult {
  success: boolean;
  jobId: string;
  status: EmailDeliveryStatus;
  messageId?: string;
  error?: string;
  isImmediate?: boolean;
}

export interface OutboxEventRecord {
  id: string;
  eventType: string;
  payload: EmailMessagePayload;
  status: "pending" | "published" | "failed";
  createdAt: string;
  publishedAt?: string;
  attempts: number;
  error?: string;
}
