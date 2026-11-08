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

async function check() {
  const res = await fetch(`${supabaseUrl}/rest/v1/organization_members?select=*`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  console.log("Status:", res.status, res.statusText);
  const data = await res.json();
  console.log("organization_members:", data);
}

check();
