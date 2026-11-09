import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

function safeResetTestData() {
  console.log("=== ORBINOVA SAFE TEST DATA RESET ===");

  if (!fs.existsSync(DATA_DIR)) {
    console.error("Data directory does not exist: ", DATA_DIR);
    return;
  }

  // 1. Create timestamped snapshot backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(DATA_DIR, `backup_pre_reset_${timestamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const allFiles = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  console.log(`\n1. Creating snapshot backup in: ${backupDir}`);
  for (const file of allFiles) {
    const src = path.join(DATA_DIR, file);
    const dest = path.join(backupDir, file);
    fs.copyFileSync(src, dest);
  }
  console.log(`✓ Backed up ${allFiles.length} JSON store files successfully.`);

  // 2. Count existing records before reset
  const readJson = (file: string) => {
    const fullPath = path.join(DATA_DIR, file);
    if (!fs.existsSync(fullPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    } catch {
      return null;
    }
  };

  const writeJson = (file: string, data: any) => {
    const fullPath = path.join(DATA_DIR, file);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf-8");
  };

  const donors = readJson("facility_donors.json") || {};
  const bloodRequests = readJson("blood_requests.json") || {};
  const donorRequests = readJson("donor_requests.json") || {};
  const donorScreenings = readJson("donor_screenings.json") || {};
  const bloodReservations = readJson("blood_reservations.json") || {};
  const notifications = readJson("in_app_notifications.json") || [];

  console.log("\n2. Records to be safely cleared:");
  console.log(`- Facility Donors: ${Object.keys(donors).length} records`);
  console.log(`- Blood Requests: ${Object.keys(bloodRequests).length} records`);
  console.log(`- Donor Requests: ${Object.keys(donorRequests).length} records`);
  console.log(`- Donor Screenings: ${Object.keys(donorScreenings).length} records`);
  console.log(`- Blood Reservations: ${Object.keys(bloodReservations).length} records`);
  console.log(`- In-App Notifications: ${Array.isArray(notifications) ? notifications.length : Object.keys(notifications).length} records`);

  // 3. Clear target files (empty state)
  writeJson("facility_donors.json", {});
  writeJson("blood_requests.json", {});
  writeJson("donor_requests.json", {});
  writeJson("donor_screenings.json", {});
  writeJson("blood_reservations.json", {});
  writeJson("in_app_notifications.json", []);

  // In blood_inventory.json, clear any lingering reserved_quantity since blood reservations are reset
  const inventory = readJson("blood_inventory.json");
  if (inventory && typeof inventory === "object") {
    for (const key of Object.keys(inventory)) {
      if (inventory[key]) {
        inventory[key].reserved_quantity = 0;
        inventory[key].available_quantity = inventory[key].quantity || 0;
      }
    }
    writeJson("blood_inventory.json", inventory);
  }

  // 4. Verify preserved institutional data
  const staff = readJson("staff_roster.json") || {};
  const bloodUnits = readJson("blood_units.json") || {};
  const auditLogs = readJson("audit_logs.json") || [];
  const centralizedLogs = readJson("centralized_audit_logs.json") || [];
  const activeSessions = readJson("active_sessions.json") || {};

  console.log("\n3. Verified PRESERVED Core Infrastructure & Institutional Data:");
  console.log(`✓ Staff Roster & Institutional Accounts: ${Object.keys(staff).length} staff members PRESERVED`);
  console.log(`✓ Blood Inventory Configurations: ${Object.keys(inventory || {}).length} inventory records PRESERVED`);
  console.log(`✓ Physical Blood Units: ${Object.keys(bloodUnits).length} units PRESERVED`);
  console.log(`✓ Centralized Audit Logs: ${Array.isArray(centralizedLogs) ? centralizedLogs.length : Object.keys(centralizedLogs).length} audit entries PRESERVED`);
  console.log(`✓ Audit Logs: ${Array.isArray(auditLogs) ? auditLogs.length : Object.keys(auditLogs).length} logs PRESERVED`);
  console.log(`✓ Active User Sessions: ${Object.keys(activeSessions).length} sessions PRESERVED`);

  console.log("\n✓ Test data reset complete! Donors, blood requests, donor requests, and screenings are now 100% clean and ready for manual creation.");
}

safeResetTestData();
