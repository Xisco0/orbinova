/**
 * ORBINOVA BACKGROUND EMAIL QUEUE ENGINE
 * Asynchronous Worker, Exponential Backoff, Idempotency Guard, & Dead-Letter Queue
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getEmailConfig } from "./config";
import {
  EmailJob,
  EmailMessagePayload,
  EmailDeliveryStatus,
  EmailSendResult,
} from "./types";
import { dispatchViaProvider } from "./emailProviderAdapter";
import { emailDeliveryLedger } from "./emailDeliveryLedger";
import { emailPreferencesStore } from "./emailPreferencesStore";

const DATA_DIR = path.join(process.cwd(), ".data");
const QUEUE_FILE = path.join(DATA_DIR, "email_queue.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readQueue(): Record<string, EmailJob> {
  ensureStoreDir();
  if (!fs.existsSync(QUEUE_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(QUEUE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeQueue(data: Record<string, EmailJob>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write email queue store:", e);
  }
}

class EmailQueueManager {
  private isProcessing = false;
  private activeWorkers = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    // Start background poller if in server environment
    if (typeof window === "undefined") {
      this.startPoller();
    }
  }

  /**
   * Generates a deterministic idempotency key for an email payload if not explicitly provided
   */
  public generateIdempotencyKey(payload: EmailMessagePayload): string {
    if (payload.metadata?.idempotencyKey) {
      return payload.metadata.idempotencyKey;
    }
    const rawRecipient = Array.isArray(payload.to) ? payload.to[0] : payload.to;
    const recipientStr = typeof rawRecipient === "string" ? rawRecipient : rawRecipient.email;
    const refStr = payload.metadata?.referenceId || payload.subject;

    return crypto
      .createHash("sha256")
      .update(`${recipientStr}:${payload.category}:${refStr}`)
      .digest("hex")
      .slice(0, 24);
  }

  /**
   * Enqueues an email job for background asynchronous delivery
   */
  public enqueue(
    payload: EmailMessagePayload,
    options?: {
      delayMs?: number;
      idempotencyKey?: string;
    }
  ): EmailSendResult {
    const config = getEmailConfig();
    const queue = readQueue();

    const rawRecipient = Array.isArray(payload.to) ? payload.to[0] : payload.to;
    const recipientEmail = typeof rawRecipient === "string" ? rawRecipient : rawRecipient.email;
    const recipientName = typeof rawRecipient === "string" ? undefined : rawRecipient.name;

    // 1. Preference & Opt-out Guard
    const isAllowed = emailPreferencesStore.isCategoryAllowed(recipientEmail, payload.category);
    if (!isAllowed) {
      console.log(`[EMAIL QUEUE SKIP] Recipient ${recipientEmail} opted out of ${payload.category} emails.`);
      return {
        success: true,
        jobId: "skipped-opt-out",
        status: "delivered", // Mark as settled
      };
    }

    // 2. Idempotency Check: Prevent duplicate sends
    const idempotencyKey = options?.idempotencyKey || this.generateIdempotencyKey(payload);

    // Check existing jobs in queue
    const existingJob = Object.values(queue).find(
      (j) => j.idempotencyKey === idempotencyKey && j.status !== "failed" && j.status !== "permanently_failed"
    );

    if (existingJob) {
      console.log(`[EMAIL QUEUE DEDUPLICATE] Existing job ${existingJob.id} matches key ${idempotencyKey}`);
      return {
        success: true,
        jobId: existingJob.id,
        status: existingJob.status,
      };
    }

    // Check delivery ledger for already delivered or sent instances
    const existingDelivery = emailDeliveryLedger.getByIdempotencyKey(idempotencyKey);
    if (existingDelivery && (existingDelivery.status === "sent" || existingDelivery.status === "delivered")) {
      console.log(`[EMAIL LEDGER DEDUPLICATE] Email already delivered with key ${idempotencyKey}`);
      return {
        success: true,
        jobId: existingDelivery.jobId,
        status: existingDelivery.status,
      };
    }

    // 3. Create New Job Record
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const nextRun = Date.now() + (options?.delayMs || 0);

    const job: EmailJob = {
      id: jobId,
      idempotencyKey,
      category: payload.category,
      payload,
      status: "queued",
      attempts: 0,
      maxAttempts: config.queue.maxAttempts,
      nextRunAt: nextRun,
      createdAt: now,
      updatedAt: now,
    };

    queue[jobId] = job;
    writeQueue(queue);

    // Initial Ledger Entry
    emailDeliveryLedger.record({
      jobId,
      idempotencyKey,
      recipient: recipientEmail,
      recipientName,
      category: payload.category,
      subject: payload.subject,
      institutionId: payload.metadata?.organizationId,
      userId: payload.metadata?.userId,
      referenceId: payload.metadata?.referenceId,
      referenceType: payload.metadata?.referenceType,
      status: "queued",
      provider: config.provider,
      attempts: 0,
    });

    // Trigger immediate async processor step
    setTimeout(() => {
      this.processNextBatch().catch(() => {});
    }, 10);

    return {
      success: true,
      jobId,
      status: "queued",
    };
  }

  /**
   * Processes the next batch of ready queued jobs with concurrency control
   */
  public async processNextBatch(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;

    try {
      const config = getEmailConfig();
      const queue = readQueue();
      const now = Date.now();

      // Find jobs ready to execute
      const readyJobs = Object.values(queue)
        .filter((j) => (j.status === "queued" || j.status === "failed") && j.nextRunAt <= now)
        .sort((a, b) => a.nextRunAt - b.nextRunAt)
        .slice(0, config.queue.batchSize);

      if (readyJobs.length === 0) {
        return 0;
      }

      const availableSlots = Math.max(1, config.queue.concurrency - this.activeWorkers);
      const jobsToProcess = readyJobs.slice(0, availableSlots);

      await Promise.all(
        jobsToProcess.map((job) => this.executeJob(job, config.queue))
      );

      return jobsToProcess.length;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Executes a single job through the provider adapter with retry and exponential backoff
   */
  private async executeJob(
    job: EmailJob,
    queueConfig: { maxAttempts: number; initialBackoffMs: number; maxBackoffMs: number }
  ): Promise<void> {
    this.activeWorkers++;
    const queue = readQueue();

    try {
      job.status = "processing";
      job.attempts += 1;
      job.lastAttemptAt = new Date().toISOString();
      job.updatedAt = new Date().toISOString();
      queue[job.id] = job;
      writeQueue(queue);

      // Dispatch to email provider
      const result = await dispatchViaProvider(job.payload);

      job.provider = result.provider;

      if (result.success) {
        // Success: Sent to provider
        job.status = "sent";
        job.providerMessageId = result.messageId;
        job.updatedAt = new Date().toISOString();
        queue[job.id] = job;
        writeQueue(queue);

        // Update Ledger
        const ledgerRecord = emailDeliveryLedger.getByJobId(job.id);
        if (ledgerRecord) {
          emailDeliveryLedger.update(ledgerRecord.id, {
            status: "sent",
            provider: result.provider,
            providerMessageId: result.messageId,
            attempts: job.attempts,
          });
        }
      } else {
        // Failure Handling
        const isPermanent = result.isPermanentError || job.attempts >= job.maxAttempts;
        job.failureReason = result.error || "Unknown provider error";

        if (isPermanent) {
          // Dead-letter Queue: Mark permanently failed
          job.status = "permanently_failed";
          job.updatedAt = new Date().toISOString();
          queue[job.id] = job;
          writeQueue(queue);

          console.error(`[EMAIL QUEUE DEAD-LETTER] Job ${job.id} permanently failed: ${job.failureReason}`);

          const ledgerRecord = emailDeliveryLedger.getByJobId(job.id);
          if (ledgerRecord) {
            emailDeliveryLedger.update(ledgerRecord.id, {
              status: "permanently_failed",
              failureReason: job.failureReason,
              attempts: job.attempts,
            });
          }
        } else {
          // Transient Failure: Schedule retry with exponential backoff
          const delay = Math.min(
            queueConfig.maxBackoffMs,
            queueConfig.initialBackoffMs * Math.pow(2, job.attempts - 1)
          );
          job.status = "failed";
          job.nextRunAt = Date.now() + delay;
          job.updatedAt = new Date().toISOString();
          queue[job.id] = job;
          writeQueue(queue);

          console.warn(`[EMAIL QUEUE RETRY] Job ${job.id} failed (attempt ${job.attempts}). Retrying in ${delay}ms: ${job.failureReason}`);

          const ledgerRecord = emailDeliveryLedger.getByJobId(job.id);
          if (ledgerRecord) {
            emailDeliveryLedger.update(ledgerRecord.id, {
              status: "failed",
              failureReason: job.failureReason,
              attempts: job.attempts,
            });
          }
        }
      }
    } catch (err: any) {
      job.status = "failed";
      job.failureReason = err.message || "Unhandled execution error";
      queue[job.id] = job;
      writeQueue(queue);
    } finally {
      this.activeWorkers--;
    }
  }

  /**
   * Background interval poller
   */
  private startPoller() {
    if (this.timer) return;
    const config = getEmailConfig();

    this.timer = setInterval(() => {
      this.processNextBatch().catch(() => {});
    }, config.queue.pollIntervalMs);

    if (this.timer.unref) {
      this.timer.unref();
    }
  }

  /**
   * Query status of an enqueued job
   */
  public getJob(jobId: string): EmailJob | null {
    const queue = readQueue();
    return queue[jobId] || null;
  }

  /**
   * Retrieves all jobs in the dead-letter queue
   */
  public getDeadLetterJobs(): EmailJob[] {
    const queue = readQueue();
    return Object.values(queue).filter((j) => j.status === "permanently_failed");
  }

  /**
   * Resets / clears all queue entries (used in test teardown)
   */
  public clear(): void {
    writeQueue({});
  }
}

export const emailQueue = new EmailQueueManager();
