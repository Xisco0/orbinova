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

import { updateStaffMemberAction } from "../src/actions/staffActions";

async function testValidation() {
  console.log("Testing updateStaffMemberAction validation (empty name)...");
  const resEmpty = await updateStaffMemberAction({
    userId: "test-user-id",
    fullName: "",
    memberRole: "doctor",
  });
  console.log("Empty name result:", resEmpty);

  console.log("Testing updateStaffMemberAction unauthorized session guard...");
  const resUnauth = await updateStaffMemberAction({
    userId: "test-user-id",
    fullName: "Dr. Kelechi Okafor",
    memberRole: "doctor",
  });
  console.log("Unauthorized result:", resUnauth);
}

testValidation();
