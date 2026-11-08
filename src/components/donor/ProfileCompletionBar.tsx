import React from "react";
import Link from "next/link";
import { ArrowRight, Activity } from "lucide-react";

interface ProfileCompletionBarProps {
  percentage: number;
  missingFields: string[];
}

export function ProfileCompletionBar({
  percentage,
  missingFields,
}: ProfileCompletionBarProps) {
  if (percentage >= 100) return null;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50 via-teal-50/50 to-white border border-blue-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="space-y-2 flex-1">
        <div className="flex items-center justify-between gap-2 max-w-md">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="text-xs font-bold text-dark font-poppins">
              Profile Readiness: {percentage}% Complete
            </span>
          </div>
          <span className="text-xs font-bold text-blue-700">{percentage}%</span>
        </div>

        {/* Progress Track */}
        <div className="w-full max-w-md bg-blue-100/70 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {missingFields.length > 0 && (
          <p className="text-[11px] text-slate-500 font-inter">
            Add your <strong className="text-slate-700">{missingFields.slice(0, 2).join(", ")}</strong> to improve match accuracy in emergencies.
          </p>
        )}
      </div>

      <Link
        href="/donor/profile"
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-xs hover:bg-blue-700 transition-all shrink-0 self-start sm:self-auto"
      >
        <span>Complete Profile</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
