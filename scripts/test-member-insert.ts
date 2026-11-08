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
  const orgId = "a1111111-1111-1111-1111-111111111111"; // LUTH
  const userId = "c9f7bbd8-2ad1-4499-8b71-d5bfe01a6e87"; // Dr. Tunde Fashola

  const memberPayload = {
    organization_id: orgId,
    user_id: userId,
    role: "doctor",
    is_active: true,
  };

  const insRes = await fetch(`${supabaseUrl}/rest/v1/organization_members`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(memberPayload),
  });

  console.log(`Status: ${insRes.status}`);
  const resBody = await insRes.text();
  console.log("Response:", resBody);
}

run();
