import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { ROLE_PORTAL_MAP } from "@/constants/theme";
import { UserRole } from "@/types/database";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (next) {
        return NextResponse.redirect(new URL(next, requestUrl.origin));
      }

      // Determine user role and redirect to correct portal
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const profile = profileData as { role?: UserRole } | null;
        const role = (profile?.role || user.user_metadata?.role || "donor") as UserRole;
        const targetPortal = ROLE_PORTAL_MAP[role] || "/donor";
        return NextResponse.redirect(new URL(targetPortal, requestUrl.origin));
      }
    }
  }

  // Return user to login if code exchange failed
  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", requestUrl.origin));
}
