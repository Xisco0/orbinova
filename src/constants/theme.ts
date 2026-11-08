/**
 * SmartDonor Centralized Design System Tokens
 * Official Healthcare Brand Palette & Configuration
 */

export const THEME_COLORS = {
  // Primary: Medical Blue
  primary: {
    DEFAULT: "#2563EB",
    light: "#DBEAFE",
    hover: "#1D4ED8",
    dark: "#1E3A8A",
  },
  // Secondary: Medical Teal
  secondary: {
    DEFAULT: "#0F766E",
    light: "#CCFBF1",
    hover: "#115E59",
    dark: "#134E4A",
  },
  // Accent: Cyan
  accent: {
    DEFAULT: "#06B6D4",
    light: "#CFFAFE",
    hover: "#0891B2",
    dark: "#164E63",
  },
  // Emergency / Blood: Medical Red
  blood: {
    DEFAULT: "#DC2626",
    light: "#FEE2E2",
    hover: "#B91C1C",
    dark: "#7F1D1D",
  },
  // Semantic Feedback
  success: {
    DEFAULT: "#16A34A",
    light: "#DCFCE7",
    dark: "#15803D",
  },
  warning: {
    DEFAULT: "#D97706",
    light: "#FEF3C7",
    dark: "#B45309",
  },
  // Neutrals & Surfaces
  dark: "#0F172A",
  secondaryText: "#475569",
  mutedText: "#64748B",
  border: "#E2E8F0",
  pageBackground: "#F8FAFC",
  cardBackground: "#FFFFFF",
  white: "#FFFFFF",
} as const;

export const BRAND = {
  name: "ORBINOVA",
  brandName: "ORBINOVA",
  positioning: "Integrated Healthcare Intelligence Platform",
  tagline: "Connecting Healthcare. Advancing Intelligence. Saving Lives.",
  descriptor: "INTEGRATED HEALTHCARE INTELLIGENCE",
  initials: "ON",
  supportEmail: "contact@orbinova.com",
  products: {
    donor: {
      name: "ORBINOVA Donor",
      shortName: "Donor Matching",
      description:
        "A healthcare donor coordination and blood-matching platform designed to connect verified healthcare institutions, eligible donors, blood banks, and patients requiring blood products.",
    },
    imaging: {
      name: "ORBINOVA Imaging",
      shortName: "AI Medical Imaging & Diagnostic Support",
      description:
        "An AI-assisted medical imaging platform designed to support radiologists and healthcare professionals in reviewing medical images, identifying potential abnormalities, and prioritizing clinical review.",
    },
  },
} as const;

export const USER_ROLES = {
  ADMIN: "admin",
  HOSPITAL: "hospital",
  BLOOD_BANK: "blood_bank",
  DONOR: "donor",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  hospital: "Hospital",
  blood_bank: "Blood Bank",
  donor: "Blood Donor",
};

export const ROLE_PORTAL_MAP: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  hospital: "/hospital/dashboard",
  blood_bank: "/hospital/dashboard",
  donor: "/donor/dashboard",
};

