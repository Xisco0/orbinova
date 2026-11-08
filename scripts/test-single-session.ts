import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { GET as sessionGet } from "@/app/api/auth/session/route";
import { updateSession as middlewareUpdateSession } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";
import { sessionManager, getSessionCookieName, SESSION_EXPIRED_MESSAGE } from "@/lib/auth/sessionManager";
import { staffStore } from "@/services/staffStore";
import { accountSecurity } from "@/lib/auth/accountSecurity";
import { rateLimiter } from "@/lib/auth/rateLimiter";
import { hasPermission } from "@/lib/auth/rbac";

function createMockRequest(url: string, method: string = "GET", cookies: Record<string, string> = {}, body?: any): NextRequest {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  const headers: Record<string, string> = {
    "x-forwarded-for": "127.0.0.1",
  };
  if (cookieHeader) headers["cookie"] = cookieHeader;
  if (body) headers["content-type"] = "application/json";

  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function extractCookies(response: any): Record<string, string> {
  const result: Record<string, string> = {};
  response.cookies.getAll().forEach((c: any) => {
    result[c.name] = c.value;
  });
  return result;
}

async function run() {
  console.log("================================================================================");
  console.log("ORBINOVA — SINGLE ACTIVE LOGIN SESSION PER ACCOUNT QA SUITE");
  console.log("Testing Scenarios 1 through 8...");
  console.log("================================================================================");

  let passed = 0;
  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`  ✗ [FAIL] ${msg}`);
      throw new Error(msg);
    }
    console.log(`  ✓ [PASS] ${msg}`);
    passed++;
  }

  const testEmail = "hospital@orbinova.com";
  const testPassword = "HospitalPassword2026!";
  const portalScope = "hospital";

  // Clean slate
  accountSecurity.unlockAccount(testEmail, { role: "admin" });
  await rateLimiter.clearLimit({ ip: "127.0.0.1", email: testEmail });
  await sessionManager.clearAll();

  // ---------------------------------------------------------------------------
  // SCENARIO 1: Login on Browser A, then login on Browser B. Browser A must lose access.
  // ---------------------------------------------------------------------------
  console.log("\n--- SCENARIO 1: Login Browser A -> Login Browser B -> Browser A Revoked ---");
  const loginAReq = createMockRequest("http://localhost:3000/api/auth/login", "POST", {}, {
    email: testEmail,
    password: testPassword,
    portalScope,
  });
  const loginARes = await loginPost(loginAReq);
  const dataA = await loginARes.json();
  console.log("Login A result:", loginARes.status, dataA);
  assert(loginARes.status === 200 && dataA.success, "Browser A successfully logs in (200 OK)");
  const cookiesBrowserA = extractCookies(loginARes);
  const sidA = cookiesBrowserA[getSessionCookieName(portalScope)];
  assert(Boolean(sidA), "Browser A receives HttpOnly session cookie");

  // Validate Browser A session before Browser B logs in
  const midCheckA1 = await middlewareUpdateSession(
    createMockRequest("http://localhost:3000/hospital/dashboard", "GET", cookiesBrowserA)
  );
  assert(midCheckA1.status === 200, "Browser A can access /hospital/dashboard initially");

  // Browser B logs in
  const loginBReq = createMockRequest("http://localhost:3000/api/auth/login", "POST", {}, {
    email: testEmail,
    password: testPassword,
    portalScope,
  });
  const loginBRes = await loginPost(loginBReq);
  const dataB = await loginBRes.json();
  assert(loginBRes.status === 200 && dataB.success, "Browser B successfully logs in (200 OK)");
  const cookiesBrowserB = extractCookies(loginBRes);
  const sidB = cookiesBrowserB[getSessionCookieName(portalScope)];
  assert(Boolean(sidB && sidB !== sidA), "Browser B receives a NEW, distinct session identifier");

  // Browser A attempts to access protected page after Browser B logged in
  const midCheckA2 = await middlewareUpdateSession(
    createMockRequest("http://localhost:3000/hospital/dashboard", "GET", cookiesBrowserA)
  );
  assert(midCheckA2.status === 307 || midCheckA2.status === 302 || midCheckA2.status === 303, "Browser A is rejected by Middleware redirect");
  const redirectLocA = midCheckA2.headers.get("location") || "";
  assert(redirectLocA.includes("/login") && redirectLocA.includes("reason=signed_in_elsewhere"), "Browser A is redirected to /login?reason=signed_in_elsewhere");
  assert(
    midCheckA2.headers.get("cache-control")?.includes("no-store") === true,
    "Strict anti-caching headers set on invalidation redirect (Cache-Control: no-store)"
  );

  // ---------------------------------------------------------------------------
  // SCENARIO 2: Login on Browser A, then login on another device. Browser A loses access.
  // ---------------------------------------------------------------------------
  console.log("\n--- SCENARIO 2: Cross-Device Login Invalidation ---");
  // Browser B (current active session) accesses dashboard
  const midCheckB = await middlewareUpdateSession(
    createMockRequest("http://localhost:3000/hospital/dashboard", "GET", cookiesBrowserB)
  );
  assert(midCheckB.status === 200, "Browser B (Device 2) access is valid");

  // Mobile Device C logs in
  const loginCReq = createMockRequest("http://localhost:3000/api/auth/login", "POST", {}, {
    email: testEmail,
    password: testPassword,
    portalScope,
  });
  const loginCRes = await loginPost(loginCReq);
  const cookiesDeviceC = extractCookies(loginCRes);
  assert(loginCRes.status === 200, "Device C logs in successfully");

  // Browser B now loses access
  const midCheckB2 = await middlewareUpdateSession(
    createMockRequest("http://localhost:3000/hospital/dashboard", "GET", cookiesBrowserB)
  );
  const redirectLocB = midCheckB2.headers.get("location") || "";
  assert(redirectLocB.includes("reason=signed_in_elsewhere"), "Browser B immediately loses access when Device C logs in");

  // ---------------------------------------------------------------------------
  // SCENARIO 3: Refresh the current browser after login. The session must remain valid.
  // ---------------------------------------------------------------------------
  console.log("\n--- SCENARIO 3: Page Refresh Preserves Active Session ---");
  const refreshReq1 = createMockRequest("http://localhost:3000/hospital/dashboard", "GET", cookiesDeviceC);
  const refreshRes1 = await middlewareUpdateSession(refreshReq1);
  assert(refreshRes1.status === 200, "First access to /hospital/dashboard valid");

  const refreshReq2 = createMockRequest("http://localhost:3000/hospital/dashboard", "GET", cookiesDeviceC);
  const refreshRes2 = await middlewareUpdateSession(refreshReq2);
  assert(refreshRes2.status === 200, "Page refresh keeps session valid without invalidation");

  // ---------------------------------------------------------------------------
  // SCENARIO 4: Navigate between dashboard pages. The session must remain valid.
  // ---------------------------------------------------------------------------
  console.log("\n--- SCENARIO 4: Multi-Page Navigation Preserves Active Session ---");
  const navInventory = await middlewareUpdateSession(
    createMockRequest("http://localhost:3000/hospital/inventory", "GET", cookiesDeviceC)
  );
  assert(navInventory.status === 200, "Navigating to /hospital/inventory remains valid");

  const navDonors = await middlewareUpdateSession(
    createMockRequest("http://localhost:3000/hospital/donors", "GET", cookiesDeviceC)
  );
  assert(navDonors.status === 200, "Navigating to /hospital/donors remains valid");

  const navRequests = await middlewareUpdateSession(
    createMockRequest("http://localhost:3000/hospital/blood-requests", "GET", cookiesDeviceC)
  );
  assert(navRequests.status === 200, "Navigating to /hospital/blood-requests remains valid");

  // ---------------------------------------------------------------------------
  // SCENARIO 5: Logout from the active session. Protected routes must reject it.
  // ---------------------------------------------------------------------------
  console.log("\n--- SCENARIO 5: Logout Revokes Active Session ---");
  const logoutReq = createMockRequest("http://localhost:3000/api/auth/logout", "POST", cookiesDeviceC, {
    portalScope,
  });
  const logoutRes = await logoutPost(logoutReq);
  assert(logoutRes.status === 200, "Explicit logout succeeds (200 OK)");

  const postLogoutNav = await middlewareUpdateSession(
    createMockRequest("http://localhost:3000/hospital/dashboard", "GET", cookiesDeviceC)
  );
  const postLogoutRedirect = postLogoutNav.headers.get("location") || "";
  assert(
    postLogoutRedirect.includes("/login"),
    "Post-logout request is rejected and redirected to /login"
  );

  // ---------------------------------------------------------------------------
  // SCENARIO 6: Attempt to reuse a revoked session through a direct API request.
  // ---------------------------------------------------------------------------
  console.log("\n--- SCENARIO 6: Direct API Rejection of Revoked Session ---");
  // Login fresh session
  const freshLogin = await loginPost(
    createMockRequest("http://localhost:3000/api/auth/login", "POST", {}, {
      email: testEmail,
      password: testPassword,
      portalScope,
    })
  );
  const freshCookies = extractCookies(freshLogin);

  // Check /api/auth/session with valid session
  const validApiReq = createMockRequest("http://localhost:3000/api/auth/session?portal=hospital", "GET", freshCookies);
  const validApiRes = await sessionGet(validApiReq);
  const validApiData = await validApiRes.json();
  assert(validApiRes.status === 200 && validApiData.authenticated === true, "Active session returns authenticated: true on API");

  // Login second browser to revoke fresh session
  await loginPost(
    createMockRequest("http://localhost:3000/api/auth/login", "POST", {}, {
      email: testEmail,
      password: testPassword,
      portalScope,
    })
  );

  // Attempt API request with now-revoked session
  const revokedApiReq = createMockRequest("http://localhost:3000/api/auth/session?portal=hospital", "GET", freshCookies);
  const revokedApiRes = await sessionGet(revokedApiReq);
  const revokedApiData = await revokedApiRes.json();
  assert(revokedApiRes.status === 401, "Revoked session rejected on API endpoint with HTTP 401");
  assert(revokedApiData.sessionRevoked === true, "API response marks sessionRevoked: true");
  assert(
    revokedApiData.error === SESSION_EXPIRED_MESSAGE,
    `API returns exact message: "${SESSION_EXPIRED_MESSAGE}"`
  );

  // ---------------------------------------------------------------------------
  // SCENARIO 7: Simultaneous Logins (Atomic latest login wins)
  // ---------------------------------------------------------------------------
  console.log("\n--- SCENARIO 7: Concurrent Logins (Latest Login Wins Atomically) ---");
  const concurrentLogins = await Promise.all([
    loginPost(createMockRequest("http://localhost:3000/api/auth/login", "POST", {}, { email: testEmail, password: testPassword, portalScope })),
    loginPost(createMockRequest("http://localhost:3000/api/auth/login", "POST", {}, { email: testEmail, password: testPassword, portalScope })),
    loginPost(createMockRequest("http://localhost:3000/api/auth/login", "POST", {}, { email: testEmail, password: testPassword, portalScope })),
  ]);

  const allSids = concurrentLogins.map((res) => {
    const c = extractCookies(res);
    return c[getSessionCookieName(portalScope)];
  });

  const activeFromStore = sessionManager.getActiveSession(dataA.user.id);
  assert(Boolean(activeFromStore), "Active session stored in authoritative store");
  assert(
    allSids.includes(activeFromStore!.sessionId),
    "Authoritative session matches one of the concurrent login session IDs"
  );

  // Exactly one of the 3 session IDs must validate, the earlier ones must be invalid
  const validationResults = allSids.map((sid) => sessionManager.validateSession(dataA.user.id, sid));
  const validCount = validationResults.filter(Boolean).length;
  assert(validCount === 1, `Exactly one active session remains valid under concurrency (Got: ${validCount}/3)`);

  // ---------------------------------------------------------------------------
  // SCENARIO 8: Existing Role Permissions & Data Isolation Preserved
  // ---------------------------------------------------------------------------
  console.log("\n--- SCENARIO 8: RBAC & Institutional Isolation Integrity ---");
  const staffDoctor = staffStore.get(testEmail);
  assert(hasPermission("hospital", "blood_requests.create", "doctor"), "Doctor retains blood_requests.create clearance");
  assert(hasPermission("hospital", "blood_inventory.view", "doctor"), "Doctor retains blood_inventory.view clearance");
  assert(!hasPermission("hospital", "staff.manage", "nurse"), "Nurse lacks staff.manage clearance");

  // Account lockout independence verified
  assert(accountSecurity.isAccountLocked(testEmail).isLocked === false, "Account security lockout remains independent of session revoking");

  console.log("\n================================================================================");
  console.log(`ALL 8 SCENARIOS VERIFIED: ${passed} PASSED, 0 FAILED.`);
  console.log("================================================================================");
}

run().catch((e) => {
  console.error("Single session test suite failed:", e);
  process.exit(1);
});
