/**
 * ORBINOVA CENTRALIZED EMAIL SERVICE
 * High-Performance Facade Connecting to Background Job Queue & Template Engine
 */

import { orbinovaEmail } from "@/lib/email";

export interface SendStaffInvitationEmailParams {
  toEmail: string;
  fullName?: string;
  roleLabel: string;
  organizationName: string;
  defaultPassword?: string;
  loginUrl: string;
  organizationId?: string;
}

export const emailService = {
  /**
   * Dispatches an institutional staff onboarding invitation through the background queue
   */
  async sendStaffInvitationEmail({
    toEmail,
    fullName,
    roleLabel,
    organizationName,
    defaultPassword,
    loginUrl,
    organizationId,
  }: SendStaffInvitationEmailParams): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const res = await orbinovaEmail.sendStaffInvitation({
        toEmail,
        fullName,
        roleLabel,
        organizationName,
        invitationUrl: loginUrl,
        defaultPassword,
        organizationId,
      });

      return {
        success: res.success,
        messageId: res.jobId,
        error: res.error,
      };
    } catch (err: any) {
      console.error("Failed to enqueue staff onboarding email:", err);
      return { success: false, error: err.message || "Failed to dispatch email." };
    }
  },

  /**
   * Dispatches a voluntary donor welcome email with credentials & donor portal login instructions
   */
  async sendDonorWelcomeEmail(params: {
    toEmail: string;
    fullName?: string;
    bloodGroup: string;
    organizationName: string;
    defaultPassword?: string;
    loginUrl?: string;
    organizationId?: string;
  }): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const loginUrl = params.loginUrl || `${baseUrl}/donor/login`;

      const res = await orbinovaEmail.sendDonorWelcome({
        toEmail: params.toEmail,
        fullName: params.fullName,
        bloodGroup: params.bloodGroup,
        organizationName: params.organizationName,
        loginUrl,
        defaultPassword: params.defaultPassword || "DonorPassword2026!",
        organizationId: params.organizationId,
      });

      return {
        success: res.success,
        messageId: res.jobId,
        error: res.error,
      };
    } catch (err: any) {
      console.error("Failed to enqueue donor welcome email:", err);
      return { success: false, error: err.message || "Failed to dispatch email." };
    }
  },

  /**
   * Direct access to unified email dispatchers
   */
  ...orbinovaEmail,
};
