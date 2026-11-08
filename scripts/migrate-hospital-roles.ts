import fs from "fs";
import path from "path";

interface StoredStaff {
  userId: string;
  memberId?: string;
  organizationId: string;
  fullName: string;
  surname?: string;
  email?: string;
  phone?: string;
  memberRole: string;
  isActive: boolean;
  temporaryPassword?: string;
  passwordHash?: string;
  mustChangePassword?: boolean;
  passwordChangedAt?: string | null;
  updatedAt?: string;
}

interface MigrationRecord {
  userId: string;
  email?: string;
  fullName: string;
  organizationId: string;
  previousRole: string;
  migratedRole: string;
  reason: string;
}

async function runMigration() {
  console.log("=== ORBINOVA HOSPITAL ROLES & RBAC MIGRATION ===");
  const storePath = path.join(process.cwd(), ".data", "staff_roster.json");

  if (!fs.existsSync(storePath)) {
    console.log("No staff roster store found at", storePath);
    return;
  }

  const raw = fs.readFileSync(storePath, "utf-8");
  const store: Record<string, StoredStaff> = JSON.parse(raw);

  const migrationLog: MigrationRecord[] = [];
  let migratedCount = 0;
  let preservedCount = 0;

  for (const [key, staff] of Object.entries(store)) {
    const prevRole = staff.memberRole || (staff as any).role || "clinical_staff";
    let newRole = prevRole;
    let reason = "Preserved core role";

    // Only migrate hospital organizations (leave independent blood bank operational accounts intact)
    const isHospital =
      staff.organizationId === "a1111111-1111-1111-1111-111111111111" ||
      staff.organizationId === "a3333333-3333-3333-3333-333333333333" ||
      staff.organizationId === "org-luth" ||
      !staff.organizationId.includes("22222222"); // Blood bank org ID is a2222222-2222-2222-2222-222222222222

    if (isHospital) {
      if (prevRole === "owner") {
        newRole = "owner";
        reason = "Preserved primary Hospital Owner role";
      } else if (prevRole === "manager" || prevRole === "hospital_admin") {
        newRole = "administrator";
        reason = "Migrated from legacy manager/admin to Hospital Administrator";
      } else if (prevRole === "donor_coordinator") {
        newRole = "donor_coordinator";
        reason = "Preserved Donor Coordinator role";
      } else if (prevRole === "radiologist") {
        newRole = "radiologist";
        reason = "Preserved Radiologist role for Imaging application integration";
      } else if (
        prevRole === "doctor" ||
        prevRole === "nurse" ||
        prevRole === "hospital_staff" ||
        prevRole === "staff" ||
        prevRole === "hospital"
      ) {
        // Special check: did the staff member have coordinator or radiologist title?
        const lowerName = staff.fullName.toLowerCase();
        const lowerEmail = (staff.email || "").toLowerCase();

        if (lowerName.includes("radiologist") || lowerEmail.includes("radiologist")) {
          newRole = "radiologist";
          reason = "Migrated to Radiologist based on title/diagnostic specialization";
        } else if (lowerName.includes("coordinator") || lowerEmail.includes("coordinator")) {
          newRole = "donor_coordinator";
          reason = "Migrated to Donor Coordinator based on coordinator title";
        } else {
          newRole = "clinical_staff";
          reason = `Consolidated legacy role '${prevRole}' into standard Clinical Staff role`;
        }
      }
    }

    if (newRole !== prevRole) {
      store[key] = {
        ...staff,
        memberRole: newRole,
        updatedAt: new Date().toISOString(),
      };
      migratedCount++;
      migrationLog.push({
        userId: staff.userId,
        email: staff.email,
        fullName: staff.fullName,
        organizationId: staff.organizationId,
        previousRole: prevRole,
        migratedRole: newRole,
        reason,
      });
    } else {
      preservedCount++;
    }
  }

  // Save migrated store
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf-8");

  console.log(`\nMigration completed: ${migratedCount} accounts updated, ${preservedCount} accounts preserved.`);
  console.log("\nSummary of migrated accounts:");
  console.table(
    migrationLog.map((m) => ({
      Name: m.fullName,
      Email: m.email || "N/A",
      "From Role": m.previousRole,
      "To Role": m.migratedRole,
      Reason: m.reason,
    }))
  );

  return migrationLog;
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
