/**
 * SmartDonor Database Types & Schema Definitions
 * Phase 2: Complete Relational Architecture & Type Contracts
 */

export type UserRole = "admin" | "hospital" | "blood_bank" | "donor";
export type AdminRole = "superadmin" | "admin" | "staff" | "super_admin" | "moderator" | "operations";
export type OrgType = "hospital" | "blood_bank";
export type OrgMemberRole = "owner" | "manager" | "staff";

export type CoreHospitalRole =
  | "owner" // Hospital Owner
  | "administrator" // Hospital Administrator
  | "donor_coordinator" // Donor Coordinator
  | "clinical_staff" // Clinical Staff
  | "radiologist"; // Radiologist

export type ClinicalRole =
  | "clinical_staff"
  | "doctor"
  | "radiologist"
  | "donor_coordinator"
  | "nurse"
  | "hospital_staff";

export type BloodBankRole =
  | "inventory_officer"
  | "blood_bank_technician"
  | "distribution_officer"
  | "blood_bank_staff";

export type GranularMemberRole =
  | CoreHospitalRole
  | "manager"
  | "staff"
  | ClinicalRole
  | BloodBankRole;
export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended" | "unboarded";
export type BloodGroupCode = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type CompatibilityType = "whole_blood" | "red_cells" | "plasma" | "platelets";
export type DonorAvailability = "available" | "unavailable" | "temporarily_unavailable";
export type DonorEligibility = "eligible" | "temporarily_ineligible" | "permanently_ineligible" | "pending_verification";
export type RequestUrgency = "emergency" | "urgent" | "normal";
export type RequestStatus =
  | "pending"
  | "checking_inventory"
  | "matching_blood_banks"
  | "partially_reserved"
  | "fully_reserved"
  | "awaiting_issuance"
  | "partially_issued"
  | "fully_issued"
  | "in_transit"
  | "partially_received"
  | "fully_received"
  | "partially_fulfilled"
  | "fulfilled"
  | "donor_matching"
  | "awaiting_donor_responses"
  | "awaiting_donor_screening"
  | "cancelled"
  | "expired"
  | "open"
  | "matching"
  | "draft";
export type DonorRequestStatus = "pending" | "viewed" | "accepted" | "declined" | "expired" | "cancelled" | "completed";
export type DonationStatus = "scheduled" | "completed" | "cancelled" | "rejected";
export type InventoryTxType = 
  | "donation_received"
  | "blood_issued"
  | "blood_reserved"
  | "reservation_released"
  | "expired_unit"
  | "manual_adjustment"
  | "transfer";
export type NotificationType = 
  | "blood_request"
  | "donor_request"
  | "request_accepted"
  | "request_declined"
  | "donation_reminder"
  | "verification"
  | "inventory_warning"
  | "system_notification";

// 1. Profile
export interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: UserRole;
  admin_role?: AdminRole | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 2. Organization
export interface Organization {
  id: string;
  name: string;
  organization_type: OrgType;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code?: string | null;
  latitude: number | null;
  longitude: number | null;
  license_number: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  verified_by: string | null;
  offboarded_at?: string | null;
  offboarded_by?: string | null;
  offboarding_reason?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


// 3. Organization Member
export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  member_role: GranularMemberRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 3b. Organization Invitation (Cryptographic Onboarding)
export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  member_role: GranularMemberRole;
  token_hash: string;
  invited_by: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  created_at: string;
  accepted_at?: string | null;
}

// 4. Blood Group Reference
export interface BloodGroup {
  code: BloodGroupCode;
  name: string;
  antigen_a: boolean;
  antigen_b: boolean;
  rh_factor: boolean;
  description: string | null;
  rarity_rank: number | null;
  created_at: string;
}

// 5. Blood Compatibility
export interface BloodCompatibility {
  id: string;
  donor_blood_group: BloodGroupCode;
  recipient_blood_group: BloodGroupCode;
  is_compatible: boolean;
  compatibility_type: CompatibilityType;
  notes: string | null;
  created_at: string;
}

// 6. Donor Profile
export interface DonorProfile {
  id: string;
  user_id: string;
  registering_organization_id?: string | null;
  first_name?: string | null;
  other_names?: string | null;
  surname?: string | null;
  blood_group: BloodGroupCode;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  address: string | null;
  district?: string | null;
  city: string | null;
  state: string | null;
  country: string;
  postal_code?: string | null;
  latitude: number | null;
  longitude: number | null;
  location_consent?: boolean;
  location_updated_at?: string;
  availability_status: DonorAvailability;
  eligibility_status: DonorEligibility;
  last_donation_date: string | null;
  next_eligible_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  verified_by: string | null;
  offboarded_at?: string | null;
  offboarded_by?: string | null;
  offboarding_reason?: string | null;
  created_at: string;
  updated_at: string;
}

// 6b. Donor Location History
export interface DonorLocationHistory {
  id: string;
  donor_id: string;
  country: string;
  state: string | null;
  city: string | null;
  district: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  location_consent: boolean;
  recorded_by: string | null;
  reason: string | null;
  created_at: string;
}


// 7. Donor Availability History
export interface DonorAvailabilityHistory {
  id: string;
  donor_id: string;
  status: DonorAvailability;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
}

// 8. Blood Inventory
export interface BloodInventory {
  id: string;
  organization_id: string;
  blood_group: BloodGroupCode;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  created_at: string;
  updated_at: string;
}

// 9. Blood Inventory Transaction
export interface BloodInventoryTransaction {
  id: string;
  organization_id: string;
  blood_group: BloodGroupCode;
  transaction_type: InventoryTxType;
  quantity: number;
  reference_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

// 10. Blood Request
export interface BloodRequest {
  id: string;
  organization_id: string;
  requested_by: string;
  blood_group: BloodGroupCode;
  units_required: number;
  units_fulfilled: number;
  // Independent Multi-Stage Status Tracking (ORBINOVA Status & Fulfillment Pipeline)
  hospital_stock_allocated?: number;
  internal_blood_bank_stock_allocated?: number;
  external_blood_bank_reserved_quantity?: number;
  units_reserved?: number;
  units_issued?: number;
  units_received?: number;
  remaining_shortage?: number;
  donor_support_quantity?: number;
  accepted_donors_count?: number;
  pending_donors_count?: number;
  total_matched_donors?: number;
  next_action?: {
    type: "screen_donor" | "awaiting_donor" | "issue_blood" | "confirm_receipt" | "fulfilled" | "open";
    label: string;
    description: string;
    href: string;
  };
  urgency: RequestUrgency;
  status: RequestStatus;
  required_by: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

// 11. Matching Run
export interface MatchingRun {
  id: string;
  blood_request_id: string;
  executed_at: string;
  donors_considered: number;
  donors_eligible: number;
  radius_km: number;
  created_at: string;
}

// 12. Donor Request
export interface DonorRequest {
  id: string;
  blood_request_id: string;
  matching_run_id: string | null;
  donor_id: string;
  matching_score: number;
  compatibility_score: number;
  distance_score: number;
  availability_score: number;
  urgency_score: number;
  distance_km: number | null;
  status: DonorRequestStatus;
  sent_at: string;
  responded_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// 13. Donation
export interface Donation {
  id: string;
  donor_id: string;
  organization_id: string;
  blood_request_id: string | null;
  donor_request_id: string | null;
  blood_group: BloodGroupCode;
  units_donated: number;
  donation_date: string;
  status: DonationStatus;
  notes: string | null;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

// 14. Notification
export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// 15. Audit Log
export interface AuditLog {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  checksum?: string | null;
  previous_hash?: string | null;
  hash?: string | null;
  status?: "success" | "failure" | string | null;
  description?: string | null;
  correlation_id?: string | null;
}

// Database Schema Contract for Supabase Client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Organization, "id" | "created_at">>;
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: Omit<OrganizationMember, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<OrganizationMember, "id" | "created_at">>;
      };
      blood_groups: {
        Row: BloodGroup;
        Insert: BloodGroup;
        Update: Partial<BloodGroup>;
      };
      blood_compatibility: {
        Row: BloodCompatibility;
        Insert: Omit<BloodCompatibility, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<BloodCompatibility, "id" | "created_at">>;
      };
      donor_profiles: {
        Row: DonorProfile;
        Insert: Omit<DonorProfile, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DonorProfile, "id" | "created_at">>;
      };
      donor_availability_history: {
        Row: DonorAvailabilityHistory;
        Insert: Omit<DonorAvailabilityHistory, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<DonorAvailabilityHistory, "id" | "created_at">>;
      };
      blood_inventory: {
        Row: BloodInventory;
        Insert: Omit<BloodInventory, "id" | "available_quantity" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BloodInventory, "id" | "available_quantity" | "created_at">>;
      };
      blood_inventory_transactions: {
        Row: BloodInventoryTransaction;
        Insert: Omit<BloodInventoryTransaction, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<BloodInventoryTransaction, "id" | "created_at">>;
      };
      blood_requests: {
        Row: BloodRequest;
        Insert: Omit<BloodRequest, "id" | "units_fulfilled" | "created_at" | "updated_at"> & {
          id?: string;
          units_fulfilled?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<BloodRequest, "id" | "created_at">>;
      };
      matching_runs: {
        Row: MatchingRun;
        Insert: Omit<MatchingRun, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<MatchingRun, "id" | "created_at">>;
      };
      donor_requests: {
        Row: DonorRequest;
        Insert: Omit<DonorRequest, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<DonorRequest, "id" | "created_at">>;
      };
      donations: {
        Row: Donation;
        Insert: Omit<Donation, "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Donation, "id" | "created_at">>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, "id" | "is_read" | "read_at" | "created_at"> & {
          id?: string;
          is_read?: boolean;
          read_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Notification, "id" | "created_at">>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Omit<AuditLog, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<AuditLog, "id" | "created_at">>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_role: {
        Args: { user_uuid: string };
        Returns: UserRole;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_org_member: {
        Args: { org_uuid: string };
        Returns: boolean;
      };
      is_org_manager: {
        Args: { org_uuid: string };
        Returns: boolean;
      };
    };
  };
}
