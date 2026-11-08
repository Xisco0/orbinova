import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
const envVars: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[trimmed.slice(0, idx).trim()] = val;
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function run() {
  // 1. Get all profiles with role = 'hospital'
  const profRes = await fetch(`${supabaseUrl}/rest/v1/profiles?role=eq.hospital&select=*`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  const hospitalProfiles = await profRes.json();
  console.log("Hospital Profiles:", hospitalProfiles);

  const orgId = "a1111111-1111-1111-1111-111111111111"; // LUTH

  // 2. Insert into organization_members
  for (const p of hospitalProfiles) {
    let role = "doctor";
    if (p.email === "hospital@orbinova.com") role = "owner";
    else if (p.email === "radiologist@orbinova.com") role = "radiologist";
    else if (p.email.includes("doctor") || p.email.includes("bamirin")) role = "doctor";

    const memberPayload = {
      organization_id: orgId,
      user_id: p.id,
      member_role: role,
      is_active: true,
    };

    const insRes = await fetch(`${supabaseUrl}/rest/v1/organization_members`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation,resolution=merge-duplicates",
      },
      body: JSON.stringify(memberPayload),
    });

    console.log(`Linking ${p.email} as ${role}: status ${insRes.status}`);
    const resBody = await insRes.text();
    console.log("Response:", resBody);
  }
}

run();
