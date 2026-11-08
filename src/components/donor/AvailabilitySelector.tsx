"use client";

import React, { useState } from "react";
import { CheckCircle2, Clock, AlertCircle, Activity } from "lucide-react";
import { DonorAvailability } from "@/types/database";
import { updateAvailabilityAction } from "@/actions";
import { Button } from "@/components/ui";

interface AvailabilitySelectorProps {
  currentStatus: DonorAvailability;
}

const statusOptions: {
  status: DonorAvailability;
  title: string;
  description: string;
  icon: typeof CheckCircle2;
  badge: string;
  activeColor: string;
}[] = [
  {
    status: "available",
    title: "Available to Donate",
    description: "You are active and ready to receive emergency and routine blood matching requests in your area.",
    icon: CheckCircle2,
    badge: "Active Hero",
    activeColor: "border-green-500 bg-green-50/70 text-green-900 ring-2 ring-green-500",
  },
  {
    status: "temporarily_unavailable",
    title: "Temporarily Unavailable",
    description: "You are currently busy, traveling, or feeling under the weather for a short time. Requests will be paused.",
    icon: Clock,
    badge: "Paused",
    activeColor: "border-amber-500 bg-amber-50/70 text-amber-900 ring-2 ring-amber-500",
  },
  {
    status: "unavailable",
    title: "Not Currently Available",
    description: "You cannot donate blood at this time. You will not receive any matching requests until you reactivate.",
    icon: AlertCircle,
    badge: "Inactive",
    activeColor: "border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-400",
  },
];

export function AvailabilitySelector({ currentStatus }: AvailabilitySelectorProps) {
  const [selectedStatus, setSelectedStatus] = useState<DonorAvailability>(currentStatus);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSave = async () => {
    setIsLoading(true);
    setMessage(null);

    const res = await updateAvailabilityAction(selectedStatus, note.trim() || undefined);
    setIsLoading(false);

    if (res.success) {
      setMessage({ type: "success", text: res.message || "Availability status updated." });
    } else {
      setMessage({ type: "error", text: res.error || "Failed to update availability." });
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-medium border animate-fadeIn ${
            message.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 3 Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statusOptions.map((opt) => {
          const isSelected = selectedStatus === opt.status;
          const Icon = opt.icon;

          return (
            <button
              key={opt.status}
              type="button"
              onClick={() => setSelectedStatus(opt.status)}
              className={`text-left p-5 rounded-2xl border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? opt.activeColor
                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? "bg-white shadow-xs text-dark"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  {isSelected && (
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-xs font-bold shadow-xs">
                      Selected
                    </span>
                  )}
                </div>

                <h4 className="font-poppins font-bold text-base text-dark mb-1">
                  {opt.title}
                </h4>
                <p className="text-xs text-slate-600 font-inter leading-relaxed">
                  {opt.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Status Tier</span>
                <span className="font-bold text-slate-700">{opt.badge}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Optional Note */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
        <label className="block text-xs text-slate-700 font-inter">
          Optional Note / Reason (Private)
        </label>
        <input
          type="text"
          placeholder="e.g. Traveling until next week, recovering from a cold"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-dark placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blood-500 focus:border-blood-500"
        />
        <p className="text-xs text-slate-400">
          This note is for your personal log and is not shared with hospitals.
        </p>
      </div>

      {/* Save Action */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Activity className="w-4 h-4 text-secondary-600" />
          <span>Updates immediately reflect in the SmartDonor matching network.</span>
        </div>

        <Button
          variant="blood"
          size="md"
          onClick={handleSave}
          isLoading={isLoading}
          disabled={selectedStatus === currentStatus && !note.trim()}
        >
          Update Availability
        </Button>
      </div>
    </div>
  );
}
