import fs from "fs";

const envContent = fs.readFileSync(".env.local", "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[trimmed.slice(0, idx).trim()] = val;
  }
}

import { hospitalService } from "../src/services/hospitalService";

async function main() {
  const orgId = "a1111111-1111-1111-1111-111111111111"; // LUTH
  console.log(`Fetching all staff under hospital ${orgId}...`);
  const allStaff = await hospitalService.getMembers(orgId);
  console.log(`Total staff fetched: ${allStaff.length}`);
  for (const s of allStaff) {
    console.log(`  - Staff: ${s.profile?.full_name} <${s.profile?.email}> | Assigned Role: ${s.member_role} | is_active: ${s.is_active}`);
  }

  console.log(`\nFetching inactive/pending staff under hospital ${orgId}...`);
  const inactiveStaff = await hospitalService.getMembers(orgId, { excludeActive: true });
  console.log(`Total inactive staff fetched: ${inactiveStaff.length}`);
}

main();
