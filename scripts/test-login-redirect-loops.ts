/**
 * ORBINOVA LOGIN REDIRECT & AUTHENTICATION STATE TEST SUITE
 * Validates that no redirect loops exist and that session handling,
 * route guards, and cookie lifecycles behave strictly according to requirements.
 */

async function runTestSuite() {
  const baseUrl = "http://localhost:3000";
  console.log("================================================================================");
  console.log("ORBINOVA VERIFICATION SUITE: LOGIN REDIRECTS & AUTHENTICATION INTEGRITY");
  console.log("================================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(desc: string, condition: boolean, extra?: any) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`, extra || "");
      failed++;
    }
  }

  // 1. Open /login without any cookies
  console.log("--- 1. Open /login without cookies ---");
  const res1 = await fetch(`${baseUrl}/login`, { redirect: "manual" });
  assert("GET /login returns 200 OK without redirect", res1.status === 200);

  // 2. Open /hospital without authentication
  console.log("\n--- 2. Open /hospital without authentication ---");
  const res2 = await fetch(`${baseUrl}/hospital`, { redirect: "manual" });
  assert("GET /hospital redirects to login", res2.status === 307 || res2.status === 302);
  const loc2 = res2.headers.get("location") || "";
  assert("GET /hospital location is /login?redirect=%2Fhospital", loc2.includes("/login?redirect="));

  // Follow the redirect to /login?redirect=/hospital
  const followRes2 = await fetch(`${baseUrl}${loc2}`, { redirect: "manual" });
  assert("Following redirect to login returns 200 OK (no redirect loop)", followRes2.status === 200);

  // 3. Login successfully via API
  console.log("\n--- 3. Login successfully ---");
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "hospital@orbinova.com",
      password: "HospitalPassword2026!",
      portalScope: "hospital",
    }),
  });
  const loginData = await loginRes.json();
  assert("API login returns 200 and success: true", loginRes.status === 200 && loginData.success === true);

  // Extract set-cookie headers
  const setCookieHeaders: string[] = [];
  const rawSetCookie = loginRes.headers.get("set-cookie");
  if (rawSetCookie) {
    // Collect all cookies
    setCookieHeaders.push(rawSetCookie);
  }

  // Build Cookie string
  const cookieMap: Record<string, string> = {};
  loginRes.headers.forEach((val, key) => {
    if (key.toLowerCase() === "set-cookie") {
      const parts = val.split(";")[0].split("=");
      if (parts[0] && parts[1]) {
        cookieMap[parts[0].trim()] = parts[1].trim();
      }
    }
  });

  const cookieStr = Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  assert("Login sets active session cookies", Object.keys(cookieMap).length > 0);

  // 4. Refresh / access the dashboard with authenticated cookies
  console.log("\n--- 4. Access dashboard with valid cookies ---");
  const dashRes = await fetch(`${baseUrl}/hospital/dashboard`, {
    headers: { Cookie: cookieStr },
    redirect: "manual",
  });
  assert("Authenticated request to /hospital/dashboard returns 200 OK (no redirect)", dashRes.status === 200);

  // 5. Open /login with active valid session (direct navigation without params)
  console.log("\n--- 5. Direct navigation to /login with valid session ---");
  const loginWithAuth = await fetch(`${baseUrl}/login`, {
    headers: { Cookie: cookieStr },
    redirect: "manual",
  });
  assert("Authenticated user visiting /login without params is redirected to dashboard", loginWithAuth.status === 307 || loginWithAuth.status === 302);
  const locAuth = loginWithAuth.headers.get("location") || "";
  assert("Redirect target is /hospital/dashboard", locAuth.includes("/hospital/dashboard"));

  // 6. Open /login?redirect=/hospital with cookies (stale or redirected)
  console.log("\n--- 6. Navigation to /login?redirect=/hospital (must not loop) ---");
  const loginWithRedirectParam = await fetch(`${baseUrl}/login?redirect=/hospital`, {
    headers: { Cookie: cookieStr },
    redirect: "manual",
  });
  assert("Visiting /login?redirect=... renders 200 OK (never loops back)", loginWithRedirectParam.status === 200);

  // 7. Access /hospital with an expired / invalid session cookie
  console.log("\n--- 7. Access /hospital with invalid session cookie ---");
  const fakeCookieStr = "orbinova_staff_hospital=eyJ1c2VySWQiOiJkMDAwMDAwMS0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJlbWFpbCI6Imhvc3BpdGFsQG9yYmlub3ZhLmNvbSIsInJvbGUiOiJob3NwaXRhbCIsInNjb3BlIjoiaG9zcGl0YWwiLCJzZXNzaW9uSWQiOiJzZXNzX2Zha2VfaW52YWxpZCJ9; orbinova_sid_hospital=sess_fake_invalid";
  const invalidRes = await fetch(`${baseUrl}/hospital`, {
    headers: { Cookie: fakeCookieStr },
    redirect: "manual",
  });
  assert("Invalid session on /hospital redirects to login", invalidRes.status === 307 || invalidRes.status === 302);
  const invalidLoc = invalidRes.headers.get("location") || "";
  assert("Redirect location is /login?redirect=...", invalidLoc.includes("/login?redirect="));

  const followInvalid = await fetch(`${baseUrl}${invalidLoc}`, {
    headers: { Cookie: fakeCookieStr },
    redirect: "manual",
  });
  assert("Following invalid session redirect to /login returns 200 OK (no redirect loop)", followInvalid.status === 200);

  // 8. Logout
  console.log("\n--- 8. Logout workflow ---");
  const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieStr,
    },
    body: JSON.stringify({ portalScope: "hospital" }),
  });
  assert("POST /api/auth/logout returns 200 OK", logoutRes.status === 200);

  // 9. Forgot Password and Reset Password routes accessibility
  console.log("\n--- 9. Forgot Password & Reset Password public access ---");
  const forgotRes = await fetch(`${baseUrl}/forgot-password`, { redirect: "manual" });
  assert("GET /forgot-password is publicly accessible (200 OK)", forgotRes.status === 200);

  const resetRes = await fetch(`${baseUrl}/reset-password`, { redirect: "manual" });
  assert("GET /reset-password is publicly accessible (200 OK)", resetRes.status === 200);

  const donorForgotRes = await fetch(`${baseUrl}/donor/forgot-password`, { redirect: "manual" });
  assert("GET /donor/forgot-password is publicly accessible (200 OK)", donorForgotRes.status === 200);

  // 10. Open redirect protection
  console.log("\n--- 10. Open redirect prevention ---");
  const openRedirectTest = await fetch(`${baseUrl}/login?redirect=https://malicious.com`, { redirect: "manual" });
  assert("GET /login?redirect=https://malicious.com renders login page (200 OK)", openRedirectTest.status === 200);

  // 11. Super Admin portal isolation
  console.log("\n--- 11. Admin login & portal scope ---");
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "superadmin@orbinova.com",
      password: "SuperAdminPassword2026!",
      portalScope: "admin",
    }),
  });
  const adminData = await adminLoginRes.json();
  assert("Admin login returns role admin and redirectTo /admin/dashboard", adminData.role === "admin" && adminData.redirectTo === "/admin/dashboard");

  console.log("\n================================================================================");
  console.log(`TEST RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("================================================================================\n");

  if (failed > 0) process.exit(1);
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
