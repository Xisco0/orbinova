import fs from "fs";
import path from "path";
import { BloodGroupCode, DonorEligibility, DonorAvailability } from "@/types/database";
import { isValidDonorReference, generateUniqueDonorReference } from "@/lib/donor/donorReference";
import { hashPassword, verifyPassword } from "@/lib/auth/passwordHash";

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
  temporaryPassword?: string;
  passwordHash?: string;
  mustChangePassword?: boolean;
  passwordChangedAt?: string | null;
  lastDonationDate?: string | null;
  updatedAt: string;
}

const DEFAULT_DEMO_DONORS: Record<string, StoredDonorOverride> = {
  "donor@orbinova.com": {
    userId: "d0000004-0000-0000-0000-000000000004",
    donorProfileId: "donor-profile-0004",
    donorNumber: "DONOR-100001",
    organizationId: "a1111111-1111-1111-1111-111111111111",
    fullName: "Adaobi Ezekwesili",
    email: "donor@orbinova.com",
    bloodGroup: "O+",
    eligibilityStatus: "eligible",
    isActive: true,
    temporaryPassword: "DonorPassword2026!",
    mustChangePassword: false,
    updatedAt: new Date().toISOString(),
  },
  "d0000004-0000-0000-0000-000000000004": {
    userId: "d0000004-0000-0000-0000-000000000004",
    donorProfileId: "donor-profile-0004",
    donorNumber: "DONOR-100001",
    organizationId: "a1111111-1111-1111-1111-111111111111",
    fullName: "Adaobi Ezekwesili",
    email: "donor@orbinova.com",
    bloodGroup: "O+",
    eligibilityStatus: "eligible",
    isActive: true,
    temporaryPassword: "DonorPassword2026!",
    mustChangePassword: false,
    updatedAt: new Date().toISOString(),
  },
};

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

    const found = Object.values(store).find(
      (d) =>
        d.userId === idOrEmail ||
        d.userId === cleanId ||
        d.donorProfileId === idOrEmail ||
        d.donorProfileId === cleanId ||
        (d.donorNumber && d.donorNumber.toLowerCase() === idOrEmail.toLowerCase()) ||
        (d.email && d.email.toLowerCase() === idOrEmail.toLowerCase())
    );
    if (found) return found;

    const lowerKey = idOrEmail.toLowerCase();
    return DEFAULT_DEMO_DONORS[lowerKey] || DEFAULT_DEMO_DONORS[cleanId];
  },

  /**
   * Sets a permanent password for a voluntary donor using PBKDF2 hashing.
   */
  setPassword(userIdOrEmail: string, newPassword: string): boolean {
    if (!userIdOrEmail || !newPassword) return false;
    const store = readStore();
    const cleanId = userIdOrEmail.startsWith("donor-")
      ? userIdOrEmail.replace("donor-", "")
      : userIdOrEmail;

    const hash = hashPassword(newPassword);
    let updated = false;

    for (const key of Object.keys(store)) {
      const item = store[key];
      if (
        item.userId === userIdOrEmail ||
        item.userId === cleanId ||
        item.donorProfileId === userIdOrEmail ||
        item.donorProfileId === cleanId ||
        (item.email && item.email.toLowerCase() === userIdOrEmail.toLowerCase()) ||
        key === userIdOrEmail ||
        key === cleanId
      ) {
        store[key] = {
          ...item,
          passwordHash: hash,
          temporaryPassword: undefined,
          mustChangePassword: false,
          passwordChangedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updated = true;
      }
    }

    if (updated) {
      writeStore(store);
      return true;
    }
    return false;
  },

  /**
   * Authoritatively verifies login credentials for a registered donor.
   */
  verifyCredentials(
    emailOrId: string,
    passwordAttempt: string
  ): { valid: boolean; donor?: StoredDonorOverride; mustChangePassword: boolean } {
    if (!emailOrId || !passwordAttempt) {
      return { valid: false, mustChangePassword: false };
    }
    const donor = this.get(emailOrId);
    if (!donor || donor.isActive === false) {
      return { valid: false, mustChangePassword: false };
    }

    const normalizedEmail = (donor.email || emailOrId).toLowerCase();

    // 0. Static Demo Credential Fallback
    if (normalizedEmail === "donor@orbinova.com" && passwordAttempt === "DonorPassword2026!") {
      return {
        valid: true,
        donor,
        mustChangePassword: donor.mustChangePassword === true,
      };
    }

    // 1. Permanent password check (PBKDF2 hash)
    if (donor.passwordHash && verifyPassword(passwordAttempt, donor.passwordHash)) {
      return {
        valid: true,
        donor,
        mustChangePassword: donor.mustChangePassword === true,
      };
    }

    // 2. Temporary password check (Initial unconsumed password)
    if (donor.temporaryPassword && donor.temporaryPassword === passwordAttempt) {
      return {
        valid: true,
        donor,
        mustChangePassword: donor.mustChangePassword ?? true,
      };
    }

    // 3. Newly registered facility donor default password fallback ("DonorPassword2026!")
    if (!donor.passwordHash && passwordAttempt === "DonorPassword2026!") {
      return {
        valid: true,
        donor,
        mustChangePassword: donor.mustChangePassword ?? true,
      };
    }

    return { valid: false, mustChangePassword: false };
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
