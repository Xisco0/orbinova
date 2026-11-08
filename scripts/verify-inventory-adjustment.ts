import { hasPermission, getRolePermissions } from "../src/lib/auth/rbac";
import { inventoryStore } from "../src/services/inventoryStore";
import { BloodGroupCode } from "../src/types/database";

console.log("==============================================================================");
console.log("ORBINOVA BLOOD INVENTORY MANAGEMENT & RBAC VERIFICATION SUITE");
console.log("==============================================================================");

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, title: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${title}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${title}`);
    if (details) console.error(`     Details: ${details}`);
    failedCount++;
  }
}

// --- 1. RBAC Clearance for Hospital Inventory Management ---
console.log("\n--- 1. RBAC Clearance for Hospital & Blood Bank Roles ---");
assert(
  hasPermission("hospital", "blood_inventory.manage", "owner"),
  "Hospital Facility Owner / CMO has clearance for [blood_inventory.manage]"
);
assert(
  hasPermission("hospital", "blood_inventory.manage", "manager"),
  "Hospital Manager has clearance for [blood_inventory.manage]"
);
assert(
  hasPermission("hospital", "blood_inventory.manage", "hospital_admin"),
  "Hospital Admin has clearance for [blood_inventory.manage]"
);
assert(
  hasPermission("hospital", "blood_inventory.manage", undefined),
  "Hospital Primary Role without memberRole default has clearance for [blood_inventory.manage]"
);
assert(
  hasPermission("hospital", "blood_inventory.manage", "inventory_officer"),
  "Hospital Internal Blood Bank Inventory Officer has clearance for [blood_inventory.manage]"
);
assert(
  hasPermission("hospital", "blood_inventory.manage", "technician"),
  "Hospital Internal Technician has clearance for [blood_inventory.manage]"
);
assert(
  hasPermission("blood_bank", "blood_inventory.manage", "owner"),
  "Blood Bank Administrator has clearance for [blood_inventory.manage]"
);
assert(
  hasPermission("superadmin", "blood_inventory.manage"),
  "Super Admin has clearance for [blood_inventory.manage]"
);

// --- 2. Inventory Store Persistence & Retrieval ---
console.log("\n--- 2. Inventory Store Persistence & Operations ---");
const testOrgId = "test-hospital-org-123";
const bloodGroup: BloodGroupCode = "A-";

// Initial state check
const initialItem = inventoryStore.getItem(testOrgId, bloodGroup);
assert(typeof initialItem.quantity === "number", "Initial inventory item returns numeric quantity");

// Add 5 units
inventoryStore.setQuantity(testOrgId, bloodGroup, 5, 0);
const afterAdd = inventoryStore.getItem(testOrgId, bloodGroup);
assert(afterAdd.quantity === 5, "Successfully set inventory quantity to 5 units", `Received: ${afterAdd.quantity}`);
assert(afterAdd.available_quantity === 5, "Available quantity equals 5 units");

// Reserve 2 units
inventoryStore.setQuantity(testOrgId, bloodGroup, 5, 2);
const afterReserve = inventoryStore.getItem(testOrgId, bloodGroup);
assert(afterReserve.reserved_quantity === 2, "Reserved quantity equals 2 units");
assert(afterReserve.available_quantity === 3, "Available quantity equals 3 units (5 - 2)");

// Record transaction
const tx = inventoryStore.recordTransaction({
  organization_id: testOrgId,
  blood_group: bloodGroup,
  transaction_type: "manual_adjustment",
  quantity: 5,
  reference_id: null,
  notes: "Test routine audit count",
  created_by: "user-123",
});
assert(!!tx.id, "Transaction recorded with unique ID");

const txList = inventoryStore.getTransactions(testOrgId);
assert(txList.some((t) => t.id === tx.id), "Transaction exists in audit ledger");

// Cleanup test org data
inventoryStore.setQuantity(testOrgId, bloodGroup, 0, 0);

console.log("\n==============================================================================");
console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==============================================================================");

if (failedCount > 0) process.exit(1);
