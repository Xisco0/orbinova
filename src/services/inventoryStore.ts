import fs from "fs";
import path from "path";
import {
  BloodGroupCode,
  BloodInventory,
  BloodInventoryTransaction,
  InventoryTxType,
} from "@/types/database";
import {
  getLinkedBloodBank,
  getAuthoritativeInventoryOrgId,
  KNOWN_ORGANIZATIONS,
} from "./facilityRelationships";

const DATA_DIR = path.join(process.cwd(), ".data");
const INVENTORY_FILE = path.join(DATA_DIR, "blood_inventory.json");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "blood_inventory_transactions.json");

function ensureStoreDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {}
  }
}

function readInventory(): Record<string, BloodInventory> {
  ensureStoreDir();
  if (!fs.existsSync(INVENTORY_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(INVENTORY_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeInventory(data: Record<string, BloodInventory>) {
  ensureStoreDir();
  try {
    fs.writeFileSync(INVENTORY_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write blood inventory store:", e);
  }
}

function readTransactions(): BloodInventoryTransaction[] {
  ensureStoreDir();
  if (!fs.existsSync(TRANSACTIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(TRANSACTIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeTransactions(data: BloodInventoryTransaction[]) {
  ensureStoreDir();
  try {
    fs.writeFileSync(TRANSACTIONS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Could not write blood inventory transactions store:", e);
  }
}

const standardGroups: BloodGroupCode[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const inventoryStore = {
  /**
   * Safe consolidation of legacy duplicate inventory sources.
   * A hospital's blood inventory must be managed through its hospital-owned blood bank facility.
   * If a hospital has legacy stock recorded under its parent ID rather than its linked blood bank facility,
   * this safely migrates the units into the facility record with an audit ledger entry.
   */
  consolidateDuplicateInventory(): { consolidatedCount: number; details: string[] } {
    const invMap = readInventory();
    const details: string[] = [];
    let consolidatedCount = 0;

    for (const hospital of KNOWN_ORGANIZATIONS.filter((o) => o.type === "hospital")) {
      const linkedBB = getLinkedBloodBank(hospital.id);
      if (!linkedBB) continue;

      for (const bg of standardGroups) {
        const hospKey = `${hospital.id}_${bg}`;
        const bbKey = `${linkedBB.id}_${bg}`;

        const hospItem = invMap[hospKey];
        if (hospItem && (Number(hospItem.quantity) > 0 || Number(hospItem.reserved_quantity) > 0)) {
          const hospQty = Number(hospItem.quantity) || 0;
          const hospReserved = Number(hospItem.reserved_quantity) || 0;

          const existingBB = invMap[bbKey] || {
            id: `inv-${linkedBB.id}-${bg}`,
            organization_id: linkedBB.id,
            blood_group: bg,
            quantity: 0,
            reserved_quantity: 0,
            available_quantity: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          const newBBQty = (Number(existingBB.quantity) || 0) + hospQty;
          const newBBReserved = (Number(existingBB.reserved_quantity) || 0) + hospReserved;

          invMap[bbKey] = {
            ...existingBB,
            quantity: newBBQty,
            reserved_quantity: newBBReserved,
            available_quantity: Math.max(0, newBBQty - newBBReserved),
            updated_at: new Date().toISOString(),
          };

          // Safely reconcile legacy duplicate hospital record to 0
          invMap[hospKey] = {
            ...hospItem,
            quantity: 0,
            reserved_quantity: 0,
            available_quantity: 0,
            updated_at: new Date().toISOString(),
          };

          // Record formal audit ledger entry
          this.recordTransaction({
            organization_id: linkedBB.id,
            blood_group: bg,
            transaction_type: "manual_adjustment",
            quantity: hospQty,
            reference_id: hospItem.id,
            notes: `CONSOLIDATION AUDIT: Migrated ${hospQty} units (${hospReserved} reserved) from legacy duplicate hospital record (${hospital.name}) into hospital-owned blood bank facility (${linkedBB.name}). Single owner established.`,
            created_by: "system_consolidation",
          });

          consolidatedCount++;
          details.push(`Consolidated ${hospQty} units of ${bg} from ${hospital.name} into ${linkedBB.name}`);
        }
      }
    }

    if (consolidatedCount > 0) {
      writeInventory(invMap);
    }

    return { consolidatedCount, details };
  },

  getInventory(orgId: string): BloodInventory[] {
    const authOrgId = getAuthoritativeInventoryOrgId(orgId);
    const invMap = readInventory();
    return standardGroups.map((bg) => {
      const key = `${authOrgId}_${bg}`;
      if (invMap[key]) {
        const item = invMap[key];
        const qty = Number(item.quantity) || 0;
        const reserved = Number(item.reserved_quantity) || 0;
        return {
          ...item,
          quantity: qty,
          reserved_quantity: reserved,
          available_quantity: Math.max(0, qty - reserved),
        };
      }
      return {
        id: `virtual-${bg}`,
        organization_id: authOrgId,
        blood_group: bg,
        quantity: 0,
        reserved_quantity: 0,
        available_quantity: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
  },

  getItem(orgId: string, bloodGroup: BloodGroupCode): BloodInventory {
    const authOrgId = getAuthoritativeInventoryOrgId(orgId);
    const invMap = readInventory();
    const key = `${authOrgId}_${bloodGroup}`;
    if (invMap[key]) {
      const item = invMap[key];
      const qty = Number(item.quantity) || 0;
      const reserved = Number(item.reserved_quantity) || 0;
      return {
        ...item,
        quantity: qty,
        reserved_quantity: reserved,
        available_quantity: Math.max(0, qty - reserved),
      };
    }
    return {
      id: `virtual-${bloodGroup}`,
      organization_id: authOrgId,
      blood_group: bloodGroup,
      quantity: 0,
      reserved_quantity: 0,
      available_quantity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  },

  adjustStock(
    orgId: string,
    bloodGroup: BloodGroupCode,
    direction: "add" | "remove" | "set",
    quantity: number,
    reason: string,
    createdBy: string,
    notes?: string
  ): BloodInventory {
    const authOrgId = getAuthoritativeInventoryOrgId(orgId);
    const current = this.getItem(authOrgId, bloodGroup);
    let newQty: number;
    let txType: InventoryTxType;

    if (direction === "add") {
      newQty = current.quantity + quantity;
      txType = "donation_received";
    } else if (direction === "remove") {
      newQty = Math.max(current.reserved_quantity, current.quantity - quantity);
      txType = "blood_issued";
    } else {
      newQty = Math.max(current.reserved_quantity, quantity);
      txType = "manual_adjustment";
    }

    const updated = this.setQuantity(authOrgId, bloodGroup, newQty);
    this.recordTransaction({
      organization_id: authOrgId,
      blood_group: bloodGroup,
      transaction_type: txType,
      quantity,
      reference_id: null,
      notes: notes || reason,
      created_by: createdBy,
    });

    return updated;
  },

  setQuantity(
    orgId: string,
    bloodGroup: BloodGroupCode,
    quantity: number,
    reservedQuantity?: number
  ): BloodInventory {
    const authOrgId = getAuthoritativeInventoryOrgId(orgId);
    const invMap = readInventory();
    const key = `${authOrgId}_${bloodGroup}`;
    const existing = invMap[key];

    const currentReserved = reservedQuantity !== undefined
      ? reservedQuantity
      : (existing ? Number(existing.reserved_quantity) || 0 : 0);

    const updatedItem: BloodInventory = {
      id: existing?.id || `inv-${authOrgId}-${bloodGroup}`,
      organization_id: authOrgId,
      blood_group: bloodGroup,
      quantity,
      reserved_quantity: currentReserved,
      available_quantity: Math.max(0, quantity - currentReserved),
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    invMap[key] = updatedItem;
    writeInventory(invMap);
    return updatedItem;
  },

  recordTransaction(tx: Omit<BloodInventoryTransaction, "id" | "created_at">): BloodInventoryTransaction {
    const txList = readTransactions();
    const newTx: BloodInventoryTransaction = {
      ...tx,
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    txList.unshift(newTx);
    writeTransactions(txList);
    return newTx;
  },

  getTransactions(
    orgId: string,
    filterBloodGroup?: string,
    filterTxType?: string
  ): BloodInventoryTransaction[] {
    const txList = readTransactions();
    return txList.filter((tx) => {
      if (tx.organization_id !== orgId) return false;
      if (filterBloodGroup && filterBloodGroup !== "all" && tx.blood_group !== filterBloodGroup) {
        return false;
      }
      if (filterTxType && filterTxType !== "all" && tx.transaction_type !== filterTxType) {
        return false;
      }
      return true;
    });
  },
};
