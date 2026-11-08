/**
 * ORBINOVA EMAIL DELIVERY LEDGER & AUDIT TRAIL
 * Persistent Delivery History, Webhook Correlation, & Regulatory Compliance
 */

import fs from "fs";
import path from "path";
import { EmailDeliveryRecord, EmailDeliveryStatus, EmailCategory, EmailProviderType } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const LEDGER_FILE = path.join(DATA_DIR, "email_delivery_ledger.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readLedger(): Record<string, EmailDeliveryRecord> {
  ensureStoreDir();
  if (!fs.existsSync(LEDGER_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(LEDGER_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeLedger(data: Record<string, EmailDeliveryRecord>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write email delivery ledger:", e);
  }
}

export const emailDeliveryLedger = {
  record(entry: Omit<EmailDeliveryRecord, "id" | "createdAt" | "updatedAt">): EmailDeliveryRecord {
    const store = readLedger();
    const id = `del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const record: EmailDeliveryRecord = {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now,
    };

    store[id] = record;
    writeLedger(store);
    return record;
  },

  update(id: string, updates: Partial<EmailDeliveryRecord>): EmailDeliveryRecord | null {
    const store = readLedger();
    if (!store[id]) return null;

    store[id] = {
      ...store[id],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    writeLedger(store);
    return store[id];
  },

  getById(id: string): EmailDeliveryRecord | null {
    const store = readLedger();
    return store[id] || null;
  },

  getByJobId(jobId: string): EmailDeliveryRecord | null {
    const store = readLedger();
    return Object.values(store).find((r) => r.jobId === jobId) || null;
  },

  getByIdempotencyKey(key: string): EmailDeliveryRecord | null {
    const store = readLedger();
    return Object.values(store).find((r) => r.idempotencyKey === key) || null;
  },

  getByProviderMessageId(msgId: string): EmailDeliveryRecord | null {
    const store = readLedger();
    return Object.values(store).find((r) => r.providerMessageId === msgId) || null;
  },

  updateStatusByProviderMessageId(
    msgId: string,
    status: EmailDeliveryStatus,
    failureReason?: string
  ): EmailDeliveryRecord | null {
    const record = this.getByProviderMessageId(msgId);
    if (!record) return null;

    return this.update(record.id, {
      status,
      failureReason: failureReason || record.failureReason,
      deliveredAt: status === "delivered" ? new Date().toISOString() : record.deliveredAt,
    });
  },

  query(filters?: {
    recipient?: string;
    category?: EmailCategory;
    institutionId?: string;
    status?: EmailDeliveryStatus;
    limit?: number;
  }): EmailDeliveryRecord[] {
    const store = readLedger();
    let records = Object.values(store);

    if (filters?.recipient) {
      const q = filters.recipient.toLowerCase();
      records = records.filter((r) => r.recipient.toLowerCase().includes(q));
    }
    if (filters?.category) {
      records = records.filter((r) => r.category === filters.category);
    }
    if (filters?.institutionId) {
      records = records.filter((r) => r.institutionId === filters.institutionId);
    }
    if (filters?.status) {
      records = records.filter((r) => r.status === filters.status);
    }

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (filters?.limit) {
      records = records.slice(0, filters.limit);
    }

    return records;
  },

  clear(): void {
    writeLedger({});
  },
};
