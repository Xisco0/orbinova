if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = class WebSocket {};
}

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runFullSyncVerification() {
  console.log("==================================================================");
  console.log("ORBINOVA DATABASE SYNCHRONIZATION VERIFICATION SUITE");
  console.log("Target Database:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function report(name, success, info) {
    total++;
    if (success) passed++;
    const mark = success ? "[PASS]" : "[FAIL]";
    console.log(`${mark} ${name}: ${info}`);
  }

  // 1. Connectivity Check
  try {
    const { data, error } = await supabase.from("organizations").select("id, name, email").limit(2);
    if (!error && data && data.length > 0) {
      report("Database Connectivity", true, `Connected successfully. Found ${data.length} registered facilities.`);
    } else {
      report("Database Connectivity", false, error ? error.message : "No data returned.");
    }
  } catch (err) {
    report("Database Connectivity", false, err.message);
  }

  // 2. Profiles: Read & Update
  try {
    const targetUserId = "d0000001-0000-0000-0000-000000000001"; // hospital CMO
    const { data: readProf, error: readProfErr } = await supabase.from("profiles").select("*").eq("id", targetUserId).single();
    if (!readProfErr && readProf) {
      // Test update
      const now = new Date().toISOString();
      const { error: updErr } = await supabase.from("profiles").update({ updated_at: now }).eq("id", targetUserId);
      if (!updErr) {
        report("Profiles (Read & Update)", true, `User '${readProf.full_name}' (${readProf.email}) verified and updated.`);
      } else {
        report("Profiles (Read & Update)", false, updErr.message);
      }
    } else {
      report("Profiles (Read & Update)", false, readProfErr ? readProfErr.message : "User not found.");
    }
  } catch (err) {
    report("Profiles (Read & Update)", false, err.message);
  }

  // 3. Donor Profiles: Read & Verify Synchronized Donor
  try {
    const { data: donorData, error: donorErr } = await supabase
      .from("donor_profiles")
      .select("id, donor_number, blood_group, city, state, user_id, first_name, surname")
      .eq("donor_number", "DONOR-203477")
      .single();

    if (!donorErr && donorData) {
      // Test update
      const { error: donUpdErr } = await supabase
        .from("donor_profiles")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", donorData.id);

      if (!donUpdErr) {
        report(
          "Donor Profiles (Read & Update)",
          true,
          `Donor '${donorData.first_name} ${donorData.surname}' (${donorData.donor_number}, ${donorData.blood_group}) verified and synced.`
        );
      } else {
        report("Donor Profiles (Read & Update)", false, donUpdErr.message);
      }
    } else {
      report("Donor Profiles (Read & Update)", false, donorErr ? donorErr.message : "Donor not found.");
    }
  } catch (err) {
    report("Donor Profiles (Read & Update)", false, err.message);
  }

  // 4. Blood Inventory: Read & Validate Stock
  try {
    const { data: invData, error: invErr } = await supabase
      .from("blood_inventory")
      .select("id, organization_id, blood_group, product_type, units_available, units_reserved")
      .order("blood_group", { ascending: true });

    if (!invErr && invData && invData.length > 0) {
      const summary = invData.map((i) => `${i.blood_group}: ${i.units_available} units`).join(", ");
      report("Blood Inventory (Read)", true, `Retrieved ${invData.length} stock rows (${summary}).`);
    } else {
      report("Blood Inventory (Read)", false, invErr ? invErr.message : "Inventory empty.");
    }
  } catch (err) {
    report("Blood Inventory (Read)", false, err.message);
  }

  // 5. Donations: Full CRUD Lifecycle
  try {
    const donationId = crypto.randomUUID();
    const testOrgId = "a1111111-1111-1111-1111-111111111111";

    // Create
    const { data: crtDon, error: crtDonErr } = await supabase.from("donations").insert({
      id: donationId,
      organization_id: testOrgId,
      blood_group: "O+",
      units_donated: 1,
      donation_date: new Date().toISOString().split("T")[0],
      status: "completed",
      notes: "CRUD test donation verification"
    }).select().single();

    if (crtDonErr) {
      report("Donations (Create)", false, crtDonErr.message);
    } else {
      report("Donations (Create)", true, `Created donation record ${crtDon.id} for ${crtDon.blood_group}.`);

      // Read
      const { data: readDon, error: readDonErr } = await supabase.from("donations").select("*").eq("id", donationId).single();
      const readOk = !readDonErr && readDon && readDon.id === donationId;
      report("Donations (Read)", readOk, readOk ? `Retrieved donation ${readDon.id}.` : (readDonErr ? readDonErr.message : "Not found"));

      // Update
      const { data: updDon, error: updDonErr } = await supabase.from("donations").update({
        notes: "Updated donation verification note"
      }).eq("id", donationId).select().single();
      const updOk = !updDonErr && updDon && updDon.notes.includes("Updated");
      report("Donations (Update)", updOk, updOk ? `Updated donation notes: '${updDon.notes}'.` : (updDonErr ? updDonErr.message : "Update failed"));

      // Delete
      const { error: delDonErr } = await supabase.from("donations").delete().eq("id", donationId);
      report("Donations (Delete)", !delDonErr, !delDonErr ? `Deleted test donation ${donationId}.` : delDonErr.message);
    }
  } catch (err) {
    report("Donations (Full CRUD)", false, err.message);
  }

  // 6. Organizations (Institutions) Verification
  try {
    const { data: orgData, error: orgErr } = await supabase.from("organizations").select("id, name, organization_type, is_active");
    if (!orgErr && orgData && orgData.length >= 2) {
      const names = orgData.map((o) => `${o.name} (${o.organization_type})`).join(", ");
      report("Organizations (Registry)", true, `Verified ${orgData.length} facilities: ${names}.`);
    } else {
      report("Organizations (Registry)", false, orgErr ? orgErr.message : "Insufficient organizations.");
    }
  } catch (err) {
    report("Organizations (Registry)", false, err.message);
  }

  console.log("\n==================================================================");
  console.log(`VERIFICATION SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("==================================================================");
}

runFullSyncVerification();
