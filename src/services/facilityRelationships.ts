import { OrgType, VerificationStatus } from "@/types/database";

export interface KnownFacility {
  id: string;
  name: string;
  type: OrgType;
  category: "hospital" | "hospital_owned" | "private" | "standalone";
  parent_hospital_id: string | null;
  city: string;
  state: string;
  email: string;
  is_active: boolean;
  verification_status: VerificationStatus;
}

export const KNOWN_ORGANIZATIONS: KnownFacility[] = [
  {
    id: "a1111111-1111-1111-1111-111111111111",
    name: "Lagos University Teaching Hospital (LUTH)",
    type: "hospital",
    category: "hospital",
    parent_hospital_id: null,
    city: "Surulere",
    state: "Lagos",
    email: "hospital@orbinova.com",
    is_active: true,
    verification_status: "verified",
  },
  {
    id: "b2222222-2222-2222-2222-222222222222",
    name: "LUTH Internal Blood Bank Facility",
    type: "blood_bank",
    category: "hospital_owned",
    parent_hospital_id: "a1111111-1111-1111-1111-111111111111",
    city: "Surulere",
    state: "Lagos",
    email: "internal-bloodbank@orbinova.com",
    is_active: true,
    verification_status: "verified",
  },
  {
    id: "b3333333-3333-3333-3333-333333333333",
    name: "Lagos Island Central Blood Bank (Private)",
    type: "blood_bank",
    category: "private",
    parent_hospital_id: null,
    city: "Lagos Island",
    state: "Lagos",
    email: "bloodbank@orbinova.com",
    is_active: true,
    verification_status: "verified",
  },
  {
    id: "b4444444-4444-4444-4444-444444444444",
    name: "National Standalone Blood Bank & Transfusion Center",
    type: "blood_bank",
    category: "standalone",
    parent_hospital_id: null,
    city: "Ikeja",
    state: "Lagos",
    email: "national-bloodbank@orbinova.com",
    is_active: true,
    verification_status: "verified",
  },
  {
    id: "a2222222-2222-2222-2222-222222222222",
    name: "National Orthopaedic Hospital (Hospital B)",
    type: "hospital",
    category: "hospital",
    parent_hospital_id: null,
    city: "Igbobi",
    state: "Lagos",
    email: "orthopaedic@orbinova.com",
    is_active: true,
    verification_status: "verified",
  },
  {
    id: "a3333333-3333-3333-3333-333333333333",
    name: "Abuja National Hospital (Hospital C)",
    type: "hospital",
    category: "hospital",
    parent_hospital_id: null,
    city: "Central Area",
    state: "Abuja",
    email: "abujahospital@orbinova.com",
    is_active: true,
    verification_status: "verified",
  },
];

/**
 * Resolves the linked hospital-owned blood bank facility if the hospital operates one.
 * Rule: A hospital's blood inventory must be managed through its hospital-owned blood bank facility when it operates one.
 */
export function getLinkedBloodBank(hospitalId: string): KnownFacility | null {
  if (!hospitalId) return null;
  return (
    KNOWN_ORGANIZATIONS.find(
      (org) =>
        org.type === "blood_bank" &&
        org.parent_hospital_id === hospitalId &&
        org.verification_status === "verified" &&
        org.is_active
    ) || null
  );
}

/**
 * Checks whether an institution is a parent hospital of a facility (e.g. linked internal blood bank)
 */
export function isHospitalParentOf(hospitalId: string, facilityId?: string | null): boolean {
  if (!hospitalId || !facilityId) return false;
  if (hospitalId === facilityId) return true;
  const org = KNOWN_ORGANIZATIONS.find((o) => o.id === facilityId);
  return org?.parent_hospital_id === hospitalId;
}

/**
 * Resolves the single authoritative inventory owner organization ID.
 * When a hospital operates a blood bank facility, its blood stock is managed under that facility.
 * Duplicate inventory sources such as "Hospital Own Stock" and "Hospital Internal Blood Bank" are eliminated.
 */
export function getAuthoritativeInventoryOrgId(hospitalOrOrgId: string): string {
  if (!hospitalOrOrgId) return hospitalOrOrgId;
  const linked = getLinkedBloodBank(hospitalOrOrgId);
  return linked ? linked.id : hospitalOrOrgId;
}
