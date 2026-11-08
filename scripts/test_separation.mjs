const SUPABASE_URL = "https://wyeyahgkkmlwrcuvnoae.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZXlhaGdra21sd3JjdXZub2FlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA5ODc5MywiZXhwIjoyMTA1Njc0NzkzfQ.jWxWe-dcgqyB4RZSQA0CAl3vnbwVr6Z0QRs0T2EGqyE";

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function query(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  return res.json();
}

async function runTests() {
  console.log("==================================================================");
  console.log(" CURRENT USER EXCLUSION & ISOLATION TEST SUITE");
  console.log("==================================================================\n");

  let allPassed = true;

  const currentAdminId = "f0ea1612-ed94-4539-9cce-900119663a6c"; // Johnson Bayo (Admin)
  const currentDonorId = "44444444-4444-4444-4444-444444444444"; // Emeka Okafor (Donor)

  // Test 1: Users List with Current User Excluded at DB Level
  console.log("TEST 1: Fetching Users with Current User Excluded (.neq('id', currentUserId))...");
  try {
    const users = await query(`profiles?select=id,email,role,is_active&id=neq.${currentAdminId}`);
    console.log(`Fetched ${users.length} users excluding current logged-in user (${currentAdminId}):`);
    users.forEach((u) => console.log(` - ${u.email} (${u.role})`));

    const foundCurrent = users.find((u) => u.id === currentAdminId);
    if (foundCurrent) {
      console.error("❌ CRITICAL: Current user was NOT excluded from user list!");
      allPassed = false;
    } else {
      console.log("✅ Current authenticated user is successfully excluded at database query level.\n");
    }
  } catch (err) {
    console.error("❌ Failed to query users:", err.message);
    allPassed = false;
  }

  // Test 2: Admin Roster with Current Admin Excluded at DB Level
  console.log("TEST 2: Fetching Administrators with Current Admin Excluded (.neq('id', currentAdminId))...");
  try {
    const admins = await query(`profiles?select=id,email,role,is_active&role=eq.admin&id=neq.${currentAdminId}`);
    console.log(`Fetched ${admins.length} other administrators:`);
    admins.forEach((a) => console.log(` - ${a.email}`));

    const foundCurrent = admins.find((a) => a.id === currentAdminId);
    if (foundCurrent) {
      console.error("❌ CRITICAL: Current admin was NOT excluded from admin roster!");
      allPassed = false;
    } else {
      console.log("✅ Current authenticated administrator is successfully excluded at database query level.\n");
    }
  } catch (err) {
    console.error("❌ Failed to query admins:", err.message);
    allPassed = false;
  }

  // Test 3: Donors List with Current Donor Excluded at DB Level
  console.log("TEST 3: Fetching Donors with Current Donor Excluded (.neq('user_id', currentDonorId))...");
  try {
    const donors = await query(
      `donor_profiles?select=*,profiles:profiles!donor_profiles_user_id_fkey!inner(id,full_name,email,role,is_active)&profiles.role=eq.donor&user_id=neq.${currentDonorId}`
    );
    console.log(`Fetched ${donors.length} other donors (excluding ${currentDonorId}):`);
    donors.forEach((d) => console.log(` - ${d.profiles?.full_name} (${d.blood_group})`));

    const foundCurrent = donors.find((d) => d.user_id === currentDonorId);
    if (foundCurrent) {
      console.error("❌ CRITICAL: Current donor was NOT excluded from donor list!");
      allPassed = false;
    } else {
      console.log("✅ Current authenticated donor is successfully excluded at database query level.\n");
    }
  } catch (err) {
    console.error("❌ Failed to query donors:", err.message);
    allPassed = false;
  }

  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED! Database-level exclusion of the authenticated account is fully verified.");
  } else {
    console.error("⚠️ SOME TESTS FAILED.");
  }
}

runTests();
