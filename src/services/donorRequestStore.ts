import fs from "fs";
import path from "path";
import { BloodGroupCode, CompatibilityType, RequestUrgency } from "@/types/database";
import { donorStore } from "./donorStore";

export type ExtendedDonorRequestStatus =
  | "pending"
  | "viewed"
  | "interested"
  | "accepted"
  | "unavailable"
  | "declined"
  | "withdrawn"
  | "contacted"
  | "scheduled"
  | "awaiting_screening"
  | "deferred"
  | "completed"
  | "expired"
  | "cancelled";

export interface StoredDonorRequest {
  id: string;
  blood_request_id: string;
  matching_run_id?: string | null;
  donor_id: string; // donorProfileId or userId
  matching_score: number;
  compatibility_score: number;
  distance_score: number;
  availability_score: number;
  urgency_score: number;
  distance_km: number | null;
  status: ExtendedDonorRequestStatus;
  sent_at: string;
  responded_at?: string | null;
  expires_at?: string | null;
  notes?: string | null;
  decline_reason?: string | null;
  withdrawal_reason?: string | null;
  hospital_id: string;
  hospital_name: string;
  hospital_city?: string | null;
  hospital_state?: string | null;
  blood_group: BloodGroupCode;
  component_type?: CompatibilityType;
  units_required: number;
  urgency: RequestUrgency;
  required_by?: string | null;
  created_at: string;
  updated_at: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DONOR_REQUESTS_FILE = path.join(DATA_DIR, "donor_requests.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readDonorRequests(): Record<string, StoredDonorRequest> {
  ensureStoreDir();
  if (!fs.existsSync(DONOR_REQUESTS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(DONOR_REQUESTS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeDonorRequests(data: Record<string, StoredDonorRequest>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(DONOR_REQUESTS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write donor requests store:", e);
  }
}

export const donorRequestStore = {
  getAll(): Record<string, StoredDonorRequest> {
    return readDonorRequests();
  },

  get(id: string): StoredDonorRequest | undefined {
    if (!id) return undefined;
    const all = readDonorRequests();
    return all[id];
  },

  getByDonor(donorIdOrUserId: string): StoredDonorRequest[] {
    if (!donorIdOrUserId) return [];
    const all = readDonorRequests();
    const cleanId = donorIdOrUserId.replace(/^(dp-|donor-)+/g, "");

    const validIds = new Set<string>([
      donorIdOrUserId,
      cleanId,
      `donor-${cleanId}`,
      `dp-${cleanId}`,
      `dp-donor-${cleanId}`,
    ]);

    const storedDonor = donorStore.get(donorIdOrUserId);
    if (storedDonor) {
      if (storedDonor.userId) {
        const uid = storedDonor.userId;
        const cleanUid = uid.replace(/^(dp-|donor-)+/g, "");
        validIds.add(uid);
        validIds.add(cleanUid);
        validIds.add(`donor-${cleanUid}`);
        validIds.add(`dp-${cleanUid}`);
      }
      if (storedDonor.donorProfileId) {
        const dpid = storedDonor.donorProfileId;
        const cleanDpid = dpid.replace(/^(dp-|donor-)+/g, "");
        validIds.add(dpid);
        validIds.add(cleanDpid);
        validIds.add(`donor-${cleanDpid}`);
        validIds.add(`dp-${cleanDpid}`);
      }
      if (storedDonor.email) {
        validIds.add(storedDonor.email.toLowerCase());
      }
    }

    return Object.values(all)
      .filter((r) => {
        const rId = r.donor_id || "";
        const rClean = rId.replace(/^(dp-|donor-)+/g, "");
        if (validIds.has(rId) || validIds.has(rClean)) return true;
        for (const vid of validIds) {
          if (vid.length > 8 && (rId.includes(vid) || vid.includes(rClean))) {
            return true;
          }
        }
        return false;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getByRequest(bloodRequestId: string): StoredDonorRequest[] {
    if (!bloodRequestId) return [];
    const all = readDonorRequests();
    return Object.values(all)
      .filter((r) => r.blood_request_id === bloodRequestId)
      .sort((a, b) => b.matching_score - a.matching_score);
  },

  save(req: StoredDonorRequest): void {
    const all = readDonorRequests();
    all[req.id] = {
      ...req,
      updated_at: new Date().toISOString(),
    };
    writeDonorRequests(all);
  },

  create(req: Partial<StoredDonorRequest> & { blood_request_id: string; donor_id: string }): StoredDonorRequest {
    const all = readDonorRequests();
    const id = req.id || `dr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const record: StoredDonorRequest = {
      matching_score: 0.85,
      compatibility_score: 1.0,
      distance_score: 0.9,
      availability_score: 1.0,
      urgency_score: 0.8,
      distance_km: 2.5,
      status: "pending",
      sent_at: now,
      hospital_id: "a1111111-1111-1111-1111-111111111111",
      hospital_name: "LUTH",
      blood_group: "O+",
      units_required: 1,
      urgency: "urgent",
      created_at: now,
      updated_at: now,
      ...req,
      id,
      blood_request_id: req.blood_request_id,
      donor_id: req.donor_id,
    };
    all[id] = record;
    writeDonorRequests(all);
    return record;
  },

  updateStatus(
    id: string,
    status: ExtendedDonorRequestStatus,
    metadata?: {
      reason?: string;
      notes?: string;
    }
  ): StoredDonorRequest | undefined {
    const all = readDonorRequests();
    const req = all[id];
    if (!req) return undefined;

    req.status = status;
    req.responded_at = new Date().toISOString();
    req.updated_at = new Date().toISOString();
    if (metadata?.reason) {
      if (status === "declined" || status === "unavailable") {
        req.decline_reason = metadata.reason;
      } else if (status === "withdrawn") {
        req.withdrawal_reason = metadata.reason;
      }
    }
    if (metadata?.notes) {
      req.notes = metadata.notes;
    }

    all[id] = req;
    writeDonorRequests(all);
    return req;
  },

  clear(): void {
    writeDonorRequests({});
  },
};
