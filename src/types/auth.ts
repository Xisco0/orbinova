import { Profile, UserRole, Organization } from "./database";
import { User as SupabaseUser } from "@supabase/supabase-js";

export interface AuthUser extends SupabaseUser {
  profile?: Profile | null;
  organization?: Organization | null;
}

export interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface DonorRegistrationCredentials {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  bloodType?: string;
}

export interface ResetPasswordCredentials {
  password: string;
  confirmPassword: string;
}

export interface AuthResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
