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

async function query(table: string, select = "*") {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });
  return res.json();
}

async function main() {
  console.log("=== Organizations ===");
  const orgs = await query("organizations", "id,name,organization_type");
  console.log(orgs);

  console.log("\n=== Organization Members ===");
  const members = await query("organization_members", "id,organization_id,user_id,member_role,is_active,profiles(id,full_name,email,role,is_active)");
  console.log(`Total members: ${members?.length || 0}`);
  if (Array.isArray(members)) {
    for (const m of members) {
      console.log(`- Org: ${m.organization_id} | Role: ${m.member_role} | is_active: ${m.is_active} | Staff: ${m.profiles?.full_name} (${m.profiles?.email}) | profile.is_active: ${m.profiles?.is_active}`);
    }
  }

  console.log("\n=== Profiles ===");
  const profiles = await query("profiles", "id,full_name,email,role,is_active");
  console.log(`Total profiles: ${profiles?.length || 0}`);
  if (Array.isArray(profiles)) {
    for (const p of profiles) {
      console.log(`- ${p.full_name} <${p.email}> | role: ${p.role} | active: ${p.is_active}`);
    }
  }
}

main();
