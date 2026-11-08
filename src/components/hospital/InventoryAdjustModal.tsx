"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Droplet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BloodGroupCode } from "@/types/database";
import { adjustHospitalInventoryAction } from "@/actions";
import { Modal, Button, Input, Select } from "@/components/ui";

interface InventoryAdjustModalProps {
  bloodGroup: BloodGroupCode;
  currentQuantity: number;
  currentReserved: number;
  onClose: () => void;
}

const adjustmentReasons = [
  "External blood donation received",
  "Routine physical audit / inventory count",
  "Blood issued for patient transfusion",
  "Expired unit safely disposed",
  "Inter-facility transfer received",
  "Inter-facility transfer dispatched",
  "Other operational adjustment",
];

export function InventoryAdjustModal({
  bloodGroup,
  currentQuantity,
  currentReserved,
  onClose,
}: InventoryAdjustModalProps) {
  const router = useRouter();

  const [direction, setDirection] = useState<"add" | "remove" | "set">("add");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>(adjustmentReasons[0]);
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePreview = () => {
    if (direction === "add") return currentQuantity + Number(quantity);
    if (direction === "remove") return Math.max(0, currentQuantity - Number(quantity));
    return Number(quantity);
  };

  const previewTotal = calculatePreview();
  const previewAvailable = Math.max(0, previewTotal - currentReserved);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (quantity < 0) {
      setError("Quantity cannot be negative.");
      return;
    }

    if (previewTotal < currentReserved) {
      setError(`Cannot reduce total below ${currentReserved} reserved units.`);
      return;
    }

    setIsLoading(true);

    try {
      const res = await adjustHospitalInventoryAction({
        bloodGroup,
        adjustmentDirection: direction,
        quantity: Number(quantity),
        reason,
        notes: notes.trim() || undefined,
      });

      if (!res || !res.success) {
        setError(res?.error || "Failed to adjust inventory.");
        setIsLoading(false);
        return;
      }

      onClose();
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Adjust Blood Inventory — Group ${bloodGroup}`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Current State Summary */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs font-inter">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">
              Current Total
            </span>
            <span className="font-bold text-dark text-sm">{currentQuantity}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">
              Reserved
            </span>
            <span className="font-bold text-amber-600 text-sm">{currentReserved}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">
              New Total
            </span>
            <span className="font-bold text-blood-600 text-sm">{previewTotal}</span>
          </div>
        </div>

        {/* Direction Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-700 font-inter">
            Adjustment Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDirection("add")}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                direction === "add"
                  ? "border-green-500 bg-green-50 text-green-800"
                  : "border-slate-200 hover:bg-slate-50 text-slate-600"
              }`}
            >
              + Add Units
            </button>
            <button
              type="button"
              onClick={() => setDirection("remove")}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                direction === "remove"
                  ? "border-amber-500 bg-amber-50 text-amber-800"
                  : "border-slate-200 hover:bg-slate-50 text-slate-600"
              }`}
            >
              - Remove Units
            </button>
            <button
              type="button"
              onClick={() => setDirection("set")}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                direction === "set"
                  ? "border-blue-500 bg-blue-50 text-blue-800"
                  : "border-slate-200 hover:bg-slate-50 text-slate-600"
              }`}
            >
              = Set Exact Count
            </button>
          </div>
        </div>

        {/* Quantity Input */}
        <Input
          label="Adjustment Quantity (Units)"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
          required
        />

        {/* Reason Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-700 font-inter">
            Audit Reason <span className="text-blood-600">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-dark bg-white focus:outline-hidden focus:ring-2 focus:ring-blood-500"
          >
            {adjustmentReasons.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs text-slate-700 font-inter">
            Operational Notes / Batch Details (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Batch #LAG-2026-44 received from Red Cross partner"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-dark focus:outline-hidden focus:ring-2 focus:ring-blood-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="blood"
            size="sm"
            isLoading={isLoading}
            loadingText="Recording..."
          >
            Confirm & Record Adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
