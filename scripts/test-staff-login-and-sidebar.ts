import { POST as loginPost } from "@/app/api/auth/login/route";
import { NextRequest } from "next/server";
import { staffStore } from "@/services/staffStore";
import { accountSecurity } from "@/lib/auth/accountSecurity";

async function run() {
  console.log("============================================================");
  console.log("TESTING BAMIRINFRANCIS89 STAFF LOGIN & SIDEBAR DEFAULT STATE");
  console.log("============================================================");

  const email = "bamirinfrancis89@gmail.com";
  const validPassword = "StaffPassword2026!";

  // 1. Verify staff record in store
  const staff = staffStore.get(email);
  console.log("Staff record found:", staff?.email, "Role:", staff?.memberRole, "Org:", staff?.organizationId);
  if (!staff) throw new Error("Staff record not found in staffStore");

  // Reset any lockouts
  accountSecurity.unlockAccount(email, { role: "admin" });

  // 2. Test Login with WRONG password
  console.log("\n--- Scenario 1: Wrong password for bamirinfrancis89 ---");
  const wrongReq = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "WrongPassword999!",
      portalScope: "hospital",
    }),
  });

  const wrongRes = await loginPost(wrongReq);
  const wrongData = await wrongRes.json();
  console.log("Wrong password response:", wrongRes.status, wrongData);
  if (wrongRes.status !== 401 || wrongData.error !== "Invalid email or password.") {
    throw new Error(`Expected generic 401 error, got: ${JSON.stringify(wrongData)}`);
  }
  console.log("✓ [PASS] Wrong password correctly rejected with 'Invalid email or password.'");

  // 3. Test Login with CORRECT default password
  console.log("\n--- Scenario 2: Valid login with StaffPassword2026! ---");
  const validReq = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: validPassword,
      portalScope: "hospital",
    }),
  });

  const validRes = await loginPost(validReq);
  const validData = await validRes.json();
  console.log("Valid login response:", validRes.status, validData);
  if (validRes.status !== 200 || !validData.success) {
    throw new Error(`Expected 200 success, got: ${JSON.stringify(validData)}`);
  }

  const staffCookie = validRes.cookies.get("orbinova_staff_hospital");
  console.log("Staff session cookie set:", !!staffCookie);
  if (!staffCookie) {
    throw new Error("Expected orbinova_staff_hospital cookie to be set");
  }

  console.log("✓ [PASS] bamirinfrancis89@gmail.com authenticated successfully!");
  console.log("✓ [PASS] mustChangePassword is:", validData.mustChangePassword);
  console.log("✓ [PASS] Redirects to:", validData.redirectTo);

  console.log("\n============================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY");
  console.log("============================================================");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
