/**
 * ORBINOVA CENTRALIZED CACHE MANAGEMENT & DATA FRESHNESS ENGINE
 * Enforces controlled, targeted cache invalidation across all portals:
 * - Hospital & Independent Blood Banks
 * - Voluntary Donors
 * - Admin Console
 * - Imaging Portal
 * Ensures fresh data is presented immediately without requiring manual browser clearing.
 */

import { revalidatePath, revalidateTag } from "next/cache";

export const cacheManager = {
  /**
   * Invalidate staff rosters and member profiles
   */
  invalidateStaff(organizationId?: string) {
    try {
      revalidatePath("/hospital/staff");
      revalidatePath("/hospital/dashboard");
      revalidatePath("/hospital");
      revalidatePath("/admin/staff");
      revalidatePath("/admin/dashboard");
      if (organizationId) {
        try {
          revalidateTag(`staff-${organizationId}`);
          revalidateTag(`org-${organizationId}`);
        } catch {}
      }
    } catch {}
  },

  /**
   * Invalidate voluntary donor roster, donation logs, and metrics
   */
  invalidateDonors(organizationId?: string) {
    try {
      revalidatePath("/hospital/donors");
      revalidatePath("/hospital/donations");
      revalidatePath("/hospital/dashboard");
      revalidatePath("/donor/dashboard");
      revalidatePath("/donor");
      revalidatePath("/admin/donors");
      if (organizationId) {
        try {
          revalidateTag(`donors-${organizationId}`);
        } catch {}
      }
    } catch {}
  },

  /**
   * Invalidate blood inventory levels and availability summaries
   */
  invalidateInventory(organizationId?: string) {
    try {
      revalidatePath("/hospital/inventory");
      revalidatePath("/hospital/dashboard");
      revalidatePath("/hospital/blood-requests");
      revalidatePath("/blood-bank/inventory");
      revalidatePath("/admin/inventory");
      if (organizationId) {
        try {
          revalidateTag(`inventory-${organizationId}`);
        } catch {}
      }
    } catch {}
  },

  /**
   * Invalidate blood request broadcasts, matches, and fulfillment queues
   */
  invalidateBloodRequests(organizationId?: string) {
    try {
      revalidatePath("/hospital/blood-requests");
      revalidatePath("/hospital/donor-requests");
      revalidatePath("/hospital/dashboard");
      revalidatePath("/donor/dashboard");
      revalidatePath("/admin/requests");
      if (organizationId) {
        try {
          revalidateTag(`requests-${organizationId}`);
        } catch {}
      }
    } catch {}
  },

  /**
   * Invalidate authentication and session-related routes
   */
  invalidateAuth() {
    try {
      revalidatePath("/login");
      revalidatePath("/reset-password");
      revalidatePath("/forgot-password");
      revalidatePath("/imaging");
      revalidatePath("/hospital/dashboard");
      revalidatePath("/admin/dashboard");
      revalidatePath("/donor/dashboard");
    } catch {}
  },

  /**
   * General institutional metrics invalidation
   */
  invalidateInstitution(organizationId?: string) {
    try {
      revalidatePath("/hospital");
      revalidatePath("/hospital/dashboard");
      revalidatePath("/admin");
      revalidatePath("/admin/organizations");
      if (organizationId) {
        try {
          revalidateTag(`institution-${organizationId}`);
        } catch {}
      }
    } catch {}
  },
};
