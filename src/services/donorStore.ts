import fs from "fs";
import path from "path";
import { BloodGroupCode, DonorEligibility, DonorAvailability } from "@/types/database";
import { isValidDonorReference, generateUniqueDonorReference } from "@/lib/donor/donorReference";

export interface StoredDonorOverride {
  userId: string;
  donorProfileId: string;
  donorNumber?: string;
  organizationId: string;
  registeringOrganizationId?: string;
  fullName: string;
  firstName?: string;
  otherNames?: string;
  surname?: string;
  email?: string;
  phone?: string;
  bloodGroup: BloodGroupCode;
  eligibilityStatus: DonorEligibility;
  availabilityStatus?: DonorAvailability;
  gender?: "male" | "female" | "other" | null;
  dateOfBirth?: string | null;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  state?: string | null;
  district?: string | null;
  address?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationConsent?: boolean;
  locationUpdatedAt?: string;
  isActive: boolean;
  lastDonationDate?: string | null;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "facility_donors.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readStore(): Record<string, StoredDonorOverride> {
  ensureStoreDir();
  if (!fs.existsSync(STORE_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeStore(data: Record<string, StoredDonorOverride>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write donor store:", e);
  }
}

export const donorStore = {
  getAll(): Record<string, StoredDonorOverride> {
    return readStore();
  },

  getAllList(): StoredDonorOverride[] {
    return Object.values(readStore());
  },

  get(idOrEmail: string): StoredDonorOverride | undefined {
    if (!idOrEmail) return undefined;
    const store = readStore();
    const cleanId = idOrEmail.startsWith("donor-")
      ? idOrEmail.replace("donor-", "")
      : idOrEmail;

    if (store[idOrEmail]) return store[idOrEmail];
    if (store[cleanId]) return store[cleanId];

    return Object.values(store).find(
      (d) =>
        d.userId === idOrEmail ||
        d.userId === cleanId ||
        d.donorProfileId === idOrEmail ||
        d.donorProfileId === cleanId ||
        (d.donorNumber && d.donorNumber.toLowerCase() === idOrEmail.toLowerCase()) ||
        (d.email && d.email.toLowerCase() === idOrEmail.toLowerCase())
    );
  },

  getByOrg(orgId: string): StoredDonorOverride[] {
    const store = readStore();
    return Object.values(store).filter(
      (d) => d.organizationId === orgId || d.registeringOrganizationId === orgId
    );
  },

  getMatchingDonors(bloodGroup: BloodGroupCode, _orgId?: string): StoredDonorOverride[] {
    const store = readStore();
    return Object.values(store).filter(
      (d) =>
        d.bloodGroup === bloodGroup &&
        d.isActive &&
        d.eligibilityStatus === "eligible" &&
        d.availabilityStatus !== "unavailable" &&
        d.locationConsent !== false
    );
  },

  save(donor: StoredDonorOverride): void {
    const store = readStore();
    const key = donor.donorProfileId || donor.userId || donor.email || `donor-${Date.now()}`;
    const existing =
      store[key] ||
      this.get(key) ||
      (donor.userId ? this.get(donor.userId) : undefined) ||
      (donor.donorProfileId ? this.get(donor.donorProfileId) : undefined) ||
      (donor.email ? this.get(donor.email) : undefined) ||
      ({} as Partial<StoredDonorOverride>);

    // Preserve original registeringOrganizationId if already set
    const registeringOrganizationId =
      existing.registeringOrganizationId ||
      donor.registeringOrganizationId ||
      donor.organizationId ||
      existing.organizationId;

    // Preserve or generate unique DONOR-XXXXXX reference
    let donorNumber = existing.donorNumber;
    if (!isValidDonorReference(donorNumber)) {
      donorNumber = isValidDonorReference(donor.donorNumber)
        ? donor.donorNumber
        : generateUniqueDonorReference();
    }

    store[key] = {
      ...existing,
      ...donor,
      donorNumber,
      registeringOrganizationId,
      organizationId: registeringOrganizationId || donor.organizationId,
      email: donor.email || existing.email,
      phone: donor.phone !== undefined ? donor.phone : existing.phone,
      locationConsent: donor.locationConsent !== undefined ? donor.locationConsent : (existing.locationConsent ?? true),
      locationUpdatedAt: donor.locationUpdatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    writeStore(store);
  },

  updateAvailability(idOrEmail: string, availability: DonorAvailability): void {
    if (!idOrEmail) return;
    const store = readStore();
    const cleanId = idOrEmail.startsWith("donor-")
      ? idOrEmail.replace("donor-", "")
      : idOrEmail;

    for (const key of Object.keys(store)) {
      if (
        store[key].userId === idOrEmail ||
        store[key].userId === cleanId ||
        store[key].donorProfileId === idOrEmail ||
        store[key].donorProfileId === cleanId ||
        (store[key].email && store[key].email?.toLowerCase() === idOrEmail.toLowerCase()) ||
        key === idOrEmail ||
        key === cleanId
      ) {
        store[key].availabilityStatus = availability;
        store[key].updatedAt = new Date().toISOString();
      }
    }
    writeStore(store);
  },

  updateEligibility(idOrEmail: string, eligibility: DonorEligibility): void {
    if (!idOrEmail) return;
    const store = readStore();
    const cleanId = idOrEmail.startsWith("donor-")
      ? idOrEmail.replace("donor-", "")
      : idOrEmail;

    for (const key of Object.keys(store)) {
      if (
        store[key].userId === idOrEmail ||
        store[key].userId === cleanId ||
        store[key].donorProfileId === idOrEmail ||
        store[key].donorProfileId === cleanId ||
        (store[key].email && store[key].email?.toLowerCase() === idOrEmail.toLowerCase()) ||
        key === idOrEmail ||
        key === cleanId
      ) {
        store[key].eligibilityStatus = eligibility;
        store[key].updatedAt = new Date().toISOString();
      }
    }
    writeStore(store);
  },

  updateStatus(idOrEmail: string, isActive: boolean, orgId?: string): void {
    if (!idOrEmail) return;
    const store = readStore();
    const cleanId = idOrEmail.startsWith("donor-")
      ? idOrEmail.replace("donor-", "")
      : idOrEmail;

    let found = false;
    for (const key of Object.keys(store)) {
      if (
        store[key].userId === idOrEmail ||
        store[key].userId === cleanId ||
        store[key].donorProfileId === idOrEmail ||
        store[key].donorProfileId === cleanId ||
        key === idOrEmail ||
        key === cleanId
      ) {
        store[key].isActive = isActive;
        store[key].updatedAt = new Date().toISOString();
        found = true;
      }
    }

    if (!found) {
      store[cleanId] = {
        userId: cleanId,
        donorProfileId: cleanId,
        organizationId: orgId || "",
        registeringOrganizationId: orgId || "",
        fullName: "Registered Donor",
        bloodGroup: "O+",
        eligibilityStatus: "eligible",
        availabilityStatus: "available",
        isActive: isActive,
        updatedAt: new Date().toISOString(),
      };
    }

    writeStore(store);
  },

  delete(idOrEmail: string): void {
    if (!idOrEmail) return;
    const store = readStore();
    const cleanId = idOrEmail.startsWith("donor-")
      ? idOrEmail.replace("donor-", "")
      : idOrEmail;

    for (const key of Object.keys(store)) {
      if (
        store[key].userId === idOrEmail ||
        store[key].userId === cleanId ||
        store[key].donorProfileId === idOrEmail ||
        store[key].donorProfileId === cleanId ||
        (store[key].email && store[key].email?.toLowerCase() === idOrEmail.toLowerCase()) ||
        key === idOrEmail ||
        key === cleanId
      ) {
        delete store[key];
      }
    }
    writeStore(store);
  },
};
