import { BloodGroupCode, CompatibilityType } from "@/types/database";

export interface CompatibilityResult {
  compatible: boolean;
  score: number; // 1.00 if compatible, 0.00 if incompatible
  reason?: string;
  component?: CompatibilityType;
}

/**
 * Standard Red Blood Cell Compatibility Matrix
 * (Antibodies in recipient serum must not attack donor red cell antigens)
 * Map: Donor Blood Group -> Set of Compatible Recipient Blood Groups
 */
const RED_CELL_COMPATIBILITY_MAP: Record<BloodGroupCode, Set<BloodGroupCode>> = {
  "O-": new Set(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]), // Universal red cell donor
  "O+": new Set(["O+", "A+", "B+", "AB+"]),
  "A-": new Set(["A-", "A+", "AB-", "AB+"]),
  "A+": new Set(["A+", "AB+"]),
  "B-": new Set(["B-", "B+", "AB-", "AB+"]),
  "B+": new Set(["B+", "AB+"]),
  "AB-": new Set(["AB-", "AB+"]),
  "AB+": new Set(["AB+"]), // Universal red cell recipient
};

/**
 * Whole Blood Compatibility Matrix
 * Strictly identical ABO/Rh matching is preferred; O- serves as universal emergency backup.
 */
const WHOLE_BLOOD_COMPATIBILITY_MAP: Record<BloodGroupCode, Set<BloodGroupCode>> = {
  "O-": new Set(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]),
  "O+": new Set(["O+"]),
  "A-": new Set(["A-", "A+"]),
  "A+": new Set(["A+"]),
  "B-": new Set(["B-", "B+"]),
  "B+": new Set(["B+"]),
  "AB-": new Set(["AB-", "AB+"]),
  "AB+": new Set(["AB+"]),
};

/**
 * Plasma (Fresh Frozen Plasma) Compatibility Matrix
 * In plasma, antibodies are in the DONOR plasma.
 * AB has no Anti-A or Anti-B antibodies -> Universal Plasma Donor.
 * O has both Anti-A and Anti-B antibodies -> Can ONLY be given to O recipients.
 */
const PLASMA_COMPATIBILITY_MAP: Record<BloodGroupCode, Set<BloodGroupCode>> = {
  "AB+": new Set(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]), // Universal plasma donor
  "AB-": new Set(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]), // Universal plasma donor
  "A+": new Set(["A-", "A+", "O-", "O+"]),
  "A-": new Set(["A-", "A+", "O-", "O+"]),
  "B+": new Set(["B-", "B+", "O-", "O+"]),
  "B-": new Set(["B-", "B+", "O-", "O+"]),
  "O+": new Set(["O-", "O+"]), // Can only give plasma to O
  "O-": new Set(["O-", "O+"]), // Can only give plasma to O
};

/**
 * Platelets Compatibility Matrix
 * ABO-identical preferred; AB platelets have no plasma antibodies (universal).
 */
const PLATELETS_COMPATIBILITY_MAP: Record<BloodGroupCode, Set<BloodGroupCode>> = {
  "AB+": new Set(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]),
  "AB-": new Set(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]),
  "A+": new Set(["A+", "A-", "AB+", "AB-"]),
  "A-": new Set(["A-", "A+", "AB-", "AB+"]),
  "B+": new Set(["B+", "B-", "AB+", "AB-"]),
  "B-": new Set(["B-", "B+", "AB-", "AB+"]),
  "O+": new Set(["O+", "O-", "A+", "B+", "AB+"]),
  "O-": new Set(["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]),
};

/**
 * Evaluates whether a donor blood group is compatible with a recipient blood group
 * according to validated component-specific transfusion protocols.
 */
export function isBloodCompatible(
  donorGroup: BloodGroupCode,
  recipientGroup: BloodGroupCode,
  component: CompatibilityType = "red_cells"
): CompatibilityResult {
  let map: Record<BloodGroupCode, Set<BloodGroupCode>>;

  switch (component) {
    case "plasma":
      map = PLASMA_COMPATIBILITY_MAP;
      break;
    case "platelets":
      map = PLATELETS_COMPATIBILITY_MAP;
      break;
    case "whole_blood":
      map = WHOLE_BLOOD_COMPATIBILITY_MAP;
      break;
    case "red_cells":
    default:
      map = RED_CELL_COMPATIBILITY_MAP;
      break;
  }

  const compatibleSet = map[donorGroup];

  if (!compatibleSet) {
    return {
      compatible: false,
      score: 0.0,
      reason: `Unknown donor blood group: ${donorGroup}`,
      component,
    };
  }

  const compatible = compatibleSet.has(recipientGroup);

  return {
    compatible,
    score: compatible ? 1.0 : 0.0,
    component,
    reason: compatible
      ? `${donorGroup} is clinically compatible with ${recipientGroup} recipient for [${component}] transfusion`
      : `${donorGroup} is incompatible with ${recipientGroup} recipient for [${component}] transfusion (clinical antibody/antigen conflict)`,
  };
}

/**
 * Returns all compatible donor blood groups for a given recipient blood group and component.
 */
export function getCompatibleDonorGroups(
  recipientGroup: BloodGroupCode,
  component: CompatibilityType = "red_cells"
): BloodGroupCode[] {
  const allGroups: BloodGroupCode[] = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
  return allGroups.filter((donor) => isBloodCompatible(donor, recipientGroup, component).compatible);
}
