if (typeof (globalThis as any).WebSocket === "undefined") {
  (globalThis as any).WebSocket = class WebSocket {};
}

import { createServerClient } from "@supabase/ssr";
import {
  PortalScope,
  PORTAL_COOKIE_NAMES,
  PORTAL_COOKIE_OPTIONS,
  isRoleAuthorizedForPortal,
  getPortalFromPathname,
} from "../src/lib/auth/portalAuth";
import fs from "fs";

// Load environment variables from .env.local
let envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
let envAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (fs.existsSync(".env.local")) {
  const content = fs.readFileSync(".env.local", "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key === "NEXT_PUBLIC_SUPABASE_URL" && !envUrl) envUrl = val;
    if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" && !envAnon) envAnon = val;
  }
}

const SUPABASE_URL = envUrl || "https://fedkwhuybxklsvwecnsd.supabase.co";
const SUPABASE_ANON_KEY = envAnon || "sb_publishable_mEamFam6dV7_VLINn0Cytg_TEDVfpDa";

/**
 * Shared Browser Cookie Jar simulating multi-tab browser context
 */
class BrowserCookieJar {
  private cookies: Map<string, { value: string; options: any }> = new Map();

  getAll() {
    return Array.from(this.cookies.entries()).map(([name, { value }]) => ({ name, value }));
  }

  get(name: string): string | undefined {
    return this.cookies.get(name)?.value;
  }

  set(name: string, value: string, options: any = {}) {
    if (options.maxAge === 0 || value === "") {
      this.cookies.delete(name);
    } else {
      this.cookies.set(name, { value, options });
    }
  }

  delete(name: string) {
    this.cookies.delete(name);
  }

  has(name: string) {
    return this.cookies.has(name);
  }
}

/**
 * Creates a scoped client bound to the shared browser cookie jar
 */
function createScopedTestClient(jar: BrowserCookieJar, portal: PortalScope) {
  const cookieName = PORTAL_COOKIE_NAMES[portal];
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookieOptions: {
      name: cookieName,
      ...PORTAL_COOKIE_OPTIONS,
    },
    cookies: {
      getAll() {
        return jar.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
        cookiesToSet.forEach(({ name, value, options }) => {
          jar.set(name, value, {
            ...options,
            ...PORTAL_COOKIE_OPTIONS,
          });
        });
      },
    },
  });
}

/**
 * Simulates server-side portal authentication & role resolution
 */
async function authenticateUser(jar: BrowserCookieJar, portal: PortalScope, email: string, pass: string) {
  const client = createScopedTestClient(jar, portal);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error || !data.user) {
    throw new Error(`Auth failed for ${email} on ${portal}: ${error?.message}`);
  }

  const { data: profile } = await client
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  const role = profile?.role || data.user.user_metadata?.role || "donor";
  if (!isRoleAuthorizedForPortal(role, portal)) {
    throw new Error(`Role '${role}' is not authorized for portal '${portal}'`);
  }

  return { user: data.user, role };
}

/**
 * Simulates Middleware Route Guard evaluation for an incoming tab request
 */
async function evaluateTabRequest(jar: BrowserCookieJar, pathname: string) {
  const portal = getPortalFromPathname(pathname);
  if (!portal) return { status: 200, portal: null, authorized: true, user: null };

  const client = createScopedTestClient(jar, portal);
  const { data: { user }, error } = await client.auth.getUser();

  if (error || !user) {
    return {
      status: 302,
      portal,
      authorized: false,
      redirectTo: portal === "donor" ? "/donor/login" : "/login",
      user: null,
    };
  }

  const { data: profile } = await client
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role || "donor";
  const authorized = isRoleAuthorizedForPortal(role, portal);

  if (!authorized) {
    return {
      status: 302,
      portal,
      authorized: false,
      redirectTo: `/unauthorized?required=${portal}`,
      user: { id: user.id, email: user.email, role },
    };
  }

  return {
    status: 200,
    portal,
    authorized: true,
    redirectTo: null,
    user: { id: user.id, email: user.email, role },
  };
}

/**
 * Simulates surgical single-portal logout
 */
async function logoutPortal(jar: BrowserCookieJar, portal: PortalScope) {
  const cookieName = PORTAL_COOKIE_NAMES[portal];
  const client = createScopedTestClient(jar, portal);
  try {
    await client.auth.signOut();
  } catch {}

  // Delete only this portal's cookies
  const all = jar.getAll();
  for (const c of all) {
    if (c.name === cookieName || c.name.startsWith(`${cookieName}.`)) {
      jar.delete(c.name);
    }
  }
}

// ============================================================================
// TEST SUITE EXECUTION
// ============================================================================
let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${detail || "Condition not met"}`);
    failedCount++;
  }
}

async function runMultiTabIsolationTests() {
  console.log("==============================================================================");
  console.log("ORBINOVA MULTI-TAB AUTHENTICATION & COOKIE SESSION ISOLATION TEST SUITE");
  console.log("==============================================================================\n");

  const sharedJar = new BrowserCookieJar();

  // --------------------------------------------------------------------------
  console.log("--- 1. Login to Hospital Dashboard in Tab 1 ---");
  // --------------------------------------------------------------------------
  const hospitalCreds = { email: "hospital@orbinova.com", pass: "HospitalPassword2026!" };
  const hLogin = await authenticateUser(sharedJar, "hospital", hospitalCreds.email, hospitalCreds.pass);
  assert(!!hLogin.user, "Hospital user logged in successfully");
  assert(sharedJar.has(PORTAL_COOKIE_NAMES.hospital), `Cookie '${PORTAL_COOKIE_NAMES.hospital}' exists in cookie jar`);

  const tab1Initial = await evaluateTabRequest(sharedJar, "/hospital/dashboard");
  assert(tab1Initial.status === 200 && tab1Initial.authorized, "Tab 1: Access to /hospital/dashboard granted");
  assert(tab1Initial.user?.email === "hospital@orbinova.com", "Tab 1: Correctly identifies Hospital Admin account");

  // --------------------------------------------------------------------------
  console.log("\n--- 2. Login to Donor Dashboard in Tab 2 (Concurrent Session) ---");
  // --------------------------------------------------------------------------
  const donorCreds = { email: "donor@orbinova.com", pass: "DonorPassword2026!" };
  const dLogin = await authenticateUser(sharedJar, "donor", donorCreds.email, donorCreds.pass);
  assert(!!dLogin.user, "Donor user logged in successfully");
  assert(sharedJar.has(PORTAL_COOKIE_NAMES.donor), `Cookie '${PORTAL_COOKIE_NAMES.donor}' exists in cookie jar`);

  const tab2Initial = await evaluateTabRequest(sharedJar, "/donor/dashboard");
  assert(tab2Initial.status === 200 && tab2Initial.authorized, "Tab 2: Access to /donor/dashboard granted");
  assert(tab2Initial.user?.email === "donor@orbinova.com", "Tab 2: Correctly identifies Donor account");

  // --------------------------------------------------------------------------
  console.log("\n--- 3. Multi-Tab Concurrency Verification ---");
  // --------------------------------------------------------------------------
  assert(
    sharedJar.has(PORTAL_COOKIE_NAMES.hospital) && sharedJar.has(PORTAL_COOKIE_NAMES.donor),
    "Both sb_hospital_session and sb_donor_session coexist concurrently in the same browser jar"
  );

  const tab1Check = await evaluateTabRequest(sharedJar, "/hospital/dashboard");
  assert(tab1Check.status === 200 && tab1Check.authorized, "Tab 1 (Hospital) remains fully active after Donor login");
  assert(tab1Check.user?.email === "hospital@orbinova.com", "Tab 1 (Hospital) was NOT replaced or evicted by Tab 2");

  const tab2Check = await evaluateTabRequest(sharedJar, "/donor/dashboard");
  assert(tab2Check.status === 200 && tab2Check.authorized, "Tab 2 (Donor) remains fully active alongside Tab 1");
  assert(tab2Check.user?.email === "donor@orbinova.com", "Tab 2 (Donor) maintains its independent user identity");

  // --------------------------------------------------------------------------
  console.log("\n--- 4. Multi-Tab Refresh Simulation ---");
  // --------------------------------------------------------------------------
  console.log("  Simulating Tab 1 page refresh (F5 on /hospital/dashboard)...");
  const tab1Refreshed = await evaluateTabRequest(sharedJar, "/hospital/dashboard");
  assert(tab1Refreshed.status === 200 && tab1Refreshed.authorized, "Tab 1 page refresh preserves Hospital session");
  assert(tab1Refreshed.user?.email === "hospital@orbinova.com", "Tab 1 retains correct Hospital email upon refresh");

  console.log("  Simulating Tab 2 page refresh (F5 on /donor/dashboard)...");
  const tab2Refreshed = await evaluateTabRequest(sharedJar, "/donor/dashboard");
  assert(tab2Refreshed.status === 200 && tab2Refreshed.authorized, "Tab 2 page refresh preserves Donor session");
  assert(tab2Refreshed.user?.email === "donor@orbinova.com", "Tab 2 retains correct Donor email upon refresh");

  // --------------------------------------------------------------------------
  console.log("\n--- 5. Surgical Logout: Log out of Donor -> Hospital Remains Authenticated ---");
  // --------------------------------------------------------------------------
  console.log("  Executing surgical logout on Tab 2 (Donor)...");
  await logoutPortal(sharedJar, "donor");
  assert(!sharedJar.has(PORTAL_COOKIE_NAMES.donor), "Cookie sb_donor_session was deleted");
  assert(sharedJar.has(PORTAL_COOKIE_NAMES.hospital), "Cookie sb_hospital_session remains completely INTACT");

  const tab2AfterLogout = await evaluateTabRequest(sharedJar, "/donor/dashboard");
  assert(tab2AfterLogout.status === 302 && !tab2AfterLogout.authorized, "Tab 2 (Donor) is now unauthenticated (302 redirect to /donor/login)");

  const tab1AfterDonorLogout = await evaluateTabRequest(sharedJar, "/hospital/dashboard");
  assert(
    tab1AfterDonorLogout.status === 200 && tab1AfterDonorLogout.authorized,
    "Tab 1 (Hospital) REMAINS AUTHENTICATED after Tab 2 logged out"
  );
  assert(
    tab1AfterDonorLogout.user?.email === "hospital@orbinova.com",
    "Tab 1 (Hospital) user context is intact with no disruption"
  );

  // --------------------------------------------------------------------------
  console.log("\n--- 6. Surgical Logout: Log out of Hospital -> Donor Remains Authenticated ---");
  // --------------------------------------------------------------------------
  console.log("  Re-logging in Donor to restore dual-tab state...");
  await authenticateUser(sharedJar, "donor", donorCreds.email, donorCreds.pass);

  console.log("  Executing surgical logout on Tab 1 (Hospital)...");
  await logoutPortal(sharedJar, "hospital");
  assert(!sharedJar.has(PORTAL_COOKIE_NAMES.hospital), "Cookie sb_hospital_session was deleted");
  assert(sharedJar.has(PORTAL_COOKIE_NAMES.donor), "Cookie sb_donor_session remains completely INTACT");

  const tab1AfterLogout = await evaluateTabRequest(sharedJar, "/hospital/dashboard");
  assert(tab1AfterLogout.status === 302 && !tab1AfterLogout.authorized, "Tab 1 (Hospital) is now unauthenticated (302 redirect to /login)");

  const tab2AfterHospitalLogout = await evaluateTabRequest(sharedJar, "/donor/dashboard");
  assert(
    tab2AfterHospitalLogout.status === 200 && tab2AfterHospitalLogout.authorized,
    "Tab 2 (Donor) REMAINS AUTHENTICATED after Tab 1 logged out"
  );
  assert(
    tab2AfterHospitalLogout.user?.email === "donor@orbinova.com",
    "Tab 2 (Donor) user context is intact with no disruption"
  );

  // --------------------------------------------------------------------------
  console.log("\n--- 7. Three-Way Portal Isolation: Hospital + Donor + Imaging ---");
  // --------------------------------------------------------------------------
  console.log("  Re-logging in Hospital, Donor, and Imaging...");
  await authenticateUser(sharedJar, "hospital", hospitalCreds.email, hospitalCreds.pass);
  // Imaging user (radiologist or clinical officer with imaging access)
  const imagingCreds = { email: "hospital@orbinova.com", pass: "HospitalPassword2026!" };
  await authenticateUser(sharedJar, "imaging", imagingCreds.email, imagingCreds.pass);

  assert(
    sharedJar.has(PORTAL_COOKIE_NAMES.hospital) &&
    sharedJar.has(PORTAL_COOKIE_NAMES.donor) &&
    sharedJar.has(PORTAL_COOKIE_NAMES.imaging),
    "All three cookies (sb_hospital_session, sb_donor_session, sb_imaging_session) coexist simultaneously"
  );

  const tab1ThreeWay = await evaluateTabRequest(sharedJar, "/hospital/dashboard");
  const tab2ThreeWay = await evaluateTabRequest(sharedJar, "/donor/dashboard");
  const tab3ThreeWay = await evaluateTabRequest(sharedJar, "/imaging");

  assert(tab1ThreeWay.status === 200 && tab1ThreeWay.authorized, "Tab 1 (Hospital) valid in 3-way concurrency");
  assert(tab2ThreeWay.status === 200 && tab2ThreeWay.authorized, "Tab 2 (Donor) valid in 3-way concurrency");
  assert(tab3ThreeWay.status === 200 && tab3ThreeWay.authorized, "Tab 3 (Imaging) valid in 3-way concurrency");

  console.log("  Logging out Tab 3 (Imaging)...");
  await logoutPortal(sharedJar, "imaging");
  assert(!sharedJar.has(PORTAL_COOKIE_NAMES.imaging), "Cookie sb_imaging_session was deleted");
  assert(sharedJar.has(PORTAL_COOKIE_NAMES.hospital), "Hospital session remains active");
  assert(sharedJar.has(PORTAL_COOKIE_NAMES.donor), "Donor session remains active");

  // --------------------------------------------------------------------------
  console.log("\n--- 8. Cross-Portal Authorization Rejection (Security Boundary) ---");
  // --------------------------------------------------------------------------
  const isolatedDonorJar = new BrowserCookieJar();
  await authenticateUser(isolatedDonorJar, "donor", donorCreds.email, donorCreds.pass);

  console.log("  Attempting to access /hospital/dashboard with ONLY Donor credentials...");
  const donorTriesHospital = await evaluateTabRequest(isolatedDonorJar, "/hospital/dashboard");
  assert(
    donorTriesHospital.status === 302,
    "Access to /hospital/dashboard with Donor credentials is BLOCKED (Redirected)"
  );
  assert(
    !donorTriesHospital.authorized,
    "Donor credentials CANNOT authorize access to Hospital protected portal"
  );

  const isolatedHospitalJar = new BrowserCookieJar();
  await authenticateUser(isolatedHospitalJar, "hospital", hospitalCreds.email, hospitalCreds.pass);

  console.log("  Attempting to access /donor/dashboard with ONLY Hospital credentials...");
  const hospitalTriesDonor = await evaluateTabRequest(isolatedHospitalJar, "/donor/dashboard");
  assert(
    hospitalTriesDonor.status === 302,
    "Access to /donor/dashboard with Hospital credentials is BLOCKED (Redirected)"
  );
  assert(
    !hospitalTriesDonor.authorized,
    "Hospital credentials CANNOT authorize access to Donor protected portal"
  );

  console.log("\n==============================================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==============================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runMultiTabIsolationTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
