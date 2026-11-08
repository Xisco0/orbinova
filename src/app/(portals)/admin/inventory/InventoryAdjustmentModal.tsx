"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BloodGroupCode } from "@/types/database";
import { adjustInventoryAction } from "@/actions";
import { Button, Modal, Input, Select, Textarea } from "@/components/ui";
import { Package, AlertCircle } from "lucide-react";

interface InventoryAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: string;
  organizationName?: string;
  defaultBloodGroup?: BloodGroupCode;
  currentQuantity?: number;
}

export const InventoryAdjustmentModal: React.FC<InventoryAdjustmentModalProps> = ({
  isOpen,
  onClose,
  organizationId = "",
  organizationName = "",
  defaultBloodGroup = "O+",
  currentQuantity = 0,
}) => {
  const router = useRouter();

  const [bloodGroup, setBloodGroup] = useState<BloodGroupCode>(defaultBloodGroup);
  const [newQuantity, setNewQuantity] = useState<number>(currentQuantity);
  const [notes, setNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!organizationId) {
      setError("Please select an organization.");
      return;
    }

    if (newQuantity < 0) {
      setError("Quantity cannot be negative.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await adjustInventoryAction(
        organizationId,
        bloodGroup,
        Number(newQuantity),
        notes.trim() || "Manual administrative adjustment"
      );

      if (!res.success) {
        setError(res.error || "Failed to adjust inventory.");
      } else {
        onClose();
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual Inventory Stock Adjustment"
      description={`Update official stock count for ${organizationName || "Healthcare Facility"}. This adjustment will be recorded in the immutable audit ledger.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-blood-50 border border-blood-200 text-blood-700 text-xs font-inter">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-slate-700">Target Blood Group</label>
          <select
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value as BloodGroupCode)}
            className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium"
            disabled={isLoading}
          >
            {["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"].map((bg) => (
              <option key={bg} value={bg}>
                {bg} Blood Type
              </option>
            ))}
          </select>
        </div>

        <Input
          label="New Total Quantity (Units)"
          type="number"
          min="0"
          value={newQuantity}
          onChange={(e) => setNewQuantity(parseInt(e.target.value, 10) || 0)}
          required
          disabled={isLoading}
          helperText="Available quantity is automatically calculated as (Quantity - Reserved Units)"
        />

        <Textarea
          label="Adjustment Reason & Audit Notes"
          placeholder="e.g. Physical inventory count reconciliation after trauma surgery batch"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required
          disabled={isLoading}
        />

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading} loadingText="Recording...">
            Save & Record Transaction
          </Button>
        </div>
      </form>
    </Modal>
  );
};
