"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Droplet, Calendar, CheckCircle2 } from "lucide-react";
import { BloodGroupCode } from "@/types/database";
import { recordHospitalDonationAction } from "@/actions";
import { Modal, Button, Input } from "@/components/ui";

interface RecordDonationModalProps {
  initialDonorId?: string;
  initialBloodGroup?: BloodGroupCode;
  initialRequestId?: string;
  initialDonorRequestId?: string;
  onClose: () => void;
}

const bloodGroups: BloodGroupCode[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function RecordDonationModal({
  initialDonorId = "",
  initialBloodGroup = "O+",
  initialRequestId,
  initialDonorRequestId,
  onClose,
}: RecordDonationModalProps) {
  const router = useRouter();

  const [donorId, setDonorId] = useState(initialDonorId);
  const [bloodGroup, setBloodGroup] = useState<BloodGroupCode>(initialBloodGroup);
  const [unitsDonated, setUnitsDonated] = useState<number>(1);
  const [donationDate, setDonationDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!donorId.trim()) {
      setError("Please specify the Donor ID or Reference.");
      return;
    }

    if (unitsDonated <= 0) {
      setError("Units donated must be at least 1.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await recordHospitalDonationAction({
        donorId: donorId.trim(),
        bloodGroup,
        unitsDonated: Number(unitsDonated),
        donationDate: new Date(donationDate).toISOString(),
        bloodRequestId: initialRequestId || null,
        donorRequestId: initialDonorRequestId || null,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setError(res.error || "Failed to record donation.");
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
      title="Record Verified Blood Donation"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-2">
          <Heart className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Recording this donation will automatically update your available stock in the inventory ledger.</span>
        </div>

        <Input
          label="Donor Profile ID or UUID"
          type="text"
          value={donorId}
          onChange={(e) => setDonorId(e.target.value)}
          placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
          required
          helperText="Identifier of the participating donor"
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs text-slate-700 font-inter">
              Blood Group
            </label>
            <select
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value as BloodGroupCode)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-bold text-dark bg-white focus:outline-hidden focus:ring-2 focus:ring-blood-500"
            >
              {bloodGroups.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Units Donated"
            type="number"
            min="1"
            max="10"
            value={unitsDonated}
            onChange={(e) => setUnitsDonated(parseInt(e.target.value) || 1)}
            required
          />
        </div>

        <Input
          label="Donation Date"
          type="date"
          value={donationDate}
          onChange={(e) => setDonationDate(e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-xs text-slate-700 font-inter">
            Clinical Screening Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Hb 14.2 g/dL, BP 120/80, no adverse reactions"
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
            loadingText="Saving Record..."
          >
            Save & Update Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
