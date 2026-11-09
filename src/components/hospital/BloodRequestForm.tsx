"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Droplet,
  AlertTriangle,
  Clock,
  FileText,
  Send,
  Activity,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { BloodGroupCode, RequestUrgency } from "@/types/database";
import { createBloodRequestAction } from "@/actions";
import { Button, TextField, SelectField, Card } from "@/components/ui";

const bloodGroups: { value: BloodGroupCode; label: string; description: string }[] = [
  { value: "A+", label: "A+ (A Positive)", description: "Can receive A+, A-, O+, O-" },
  { value: "A-", label: "A- (A Negative)", description: "Can receive A-, O-" },
  { value: "B+", label: "B+ (B Positive)", description: "Can receive B+, B-, O+, O-" },
  { value: "B-", label: "B- (B Negative)", description: "Can receive B-, O-" },
  { value: "AB+", label: "AB+ (AB Positive)", description: "Universal Red Cell Recipient" },
  { value: "AB-", label: "AB- (AB Negative)", description: "Can receive all Rh-negative groups" },
  { value: "O+", label: "O+ (O Positive)", description: "Can receive O+, O-" },
  { value: "O-", label: "O- (O Negative)", description: "Universal Red Cell Donor / Can receive O- only" },
];

const urgencyOptions: {
  value: RequestUrgency;
  title: string;
  badge: string;
  desc: string;
  color: string;
}[] = [
  {
    value: "emergency",
    title: "Emergency (Level 1)",
    badge: "Immediate Life-Threat",
    desc: "Trauma, massive maternal hemorrhage, cardiac surgery. Triggers instant voluntary donor priority broadcast.",
    color: "border-red-500 bg-red-50/70 text-red-900 ring-red-500",
  },
  {
    value: "urgent",
    title: "Urgent (Level 2)",
    badge: "Needed within 6-12 hours",
    desc: "Planned urgent transfusion, acute severe anemia crisis, scheduled ICU stabilization.",
    color: "border-amber-500 bg-amber-50/70 text-amber-900 ring-amber-500",
  },
  {
    value: "normal",
    title: "Normal (Level 3)",
    badge: "Within 24-48 hours",
    desc: "Routine ward replenishment, elective elective surgery preparation, or steady inventory backup.",
    color: "border-blue-500 bg-blue-50/70 text-blue-900 ring-blue-500",
  },
];

/**
 * Returns the current date-time formatted as YYYY-MM-DDTHH:mm in local time,
 * advanced by 1 minute so past minutes cannot be selected.
 */
function getMinDateTimeString(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 1);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Returns the maximum date-time (90 days ahead) formatted as YYYY-MM-DDTHH:mm
 */
function getMaxDateTimeString(): string {
  const max = new Date();
  max.setDate(max.getDate() + 90);
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = max.getFullYear();
  const month = pad(max.getMonth() + 1);
  const day = pad(max.getDate());
  const hours = pad(max.getHours());
  const minutes = pad(max.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function BloodRequestForm() {
  const router = useRouter();

  const [bloodGroup, setBloodGroup] = useState<BloodGroupCode>("O+");
  const [unitsRequired, setUnitsRequired] = useState<number | string>(2);
  const [urgency, setUrgency] = useState<RequestUrgency>("urgent");
  const [requiredBy, setRequiredBy] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic min and max datetime strings in local timezone
  const [minDateTime, setMinDateTime] = useState<string>("");
  const [maxDateTime, setMaxDateTime] = useState<string>("");

  useEffect(() => {
    setMinDateTime(getMinDateTimeString());
    setMaxDateTime(getMaxDateTimeString());

    // Update minDateTime every minute so the boundary stays fresh
    const timer = setInterval(() => {
      setMinDateTime(getMinDateTimeString());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Live validator for preferred date & time
  const handleDateChange = (value: string) => {
    setRequiredBy(value);
    setServerError(null);

    if (!value) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.requiredBy;
        return next;
      });
      return;
    }

    const selectedTime = new Date(value).getTime();
    const nowTime = Date.now();

    if (isNaN(selectedTime)) {
      setErrors((prev) => ({
        ...prev,
        requiredBy: "Please enter a valid date and time.",
      }));
    } else if (selectedTime < nowTime) {
      setErrors((prev) => ({
        ...prev,
        requiredBy: "Required date & time cannot be in the past. Please select a future time.",
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.requiredBy;
        return next;
      });
    }
  };

  // Live validator for units required
  const handleUnitsChange = (val: string) => {
    setServerError(null);
    const parsed = parseInt(val, 10);
    setUnitsRequired(val === "" ? "" : isNaN(parsed) ? 1 : parsed);

    if (val === "" || isNaN(parsed)) {
      setErrors((prev) => ({
        ...prev,
        unitsRequired: "Please enter a valid number of units.",
      }));
    } else if (parsed < 1) {
      setErrors((prev) => ({
        ...prev,
        unitsRequired: "Units required must be at least 1 whole unit (bag).",
      }));
    } else if (parsed > 50) {
      setErrors((prev) => ({
        ...prev,
        unitsRequired: "Maximum 50 units allowed per single broadcast request.",
      }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.unitsRequired;
        return next;
      });
    }
  };

  // Form submission with comprehensive multi-field validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors: Record<string, string> = {};

    // 1. Urgency validation
    if (!["emergency", "urgent", "normal"].includes(urgency)) {
      validationErrors.urgency = "Please select a valid urgency priority level.";
    }

    // 2. Blood group validation
    const validCodes: BloodGroupCode[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
    if (!bloodGroup || !validCodes.includes(bloodGroup)) {
      validationErrors.bloodGroup = "Please select a valid blood group.";
    }

    // 3. Units required validation
    const numUnits = Number(unitsRequired);
    if (!unitsRequired || isNaN(numUnits) || numUnits < 1 || !Number.isInteger(numUnits)) {
      validationErrors.unitsRequired = "Units required must be a whole number of at least 1 bag.";
    } else if (numUnits > 50) {
      validationErrors.unitsRequired = "Units required cannot exceed 50 bags per broadcast.";
    }

    // 4. Required By date validation (strictly future, no past dates)
    if (requiredBy && requiredBy.trim()) {
      const selectedTime = new Date(requiredBy).getTime();
      const nowTime = Date.now();

      if (isNaN(selectedTime)) {
        validationErrors.requiredBy = "Please specify a valid date and time.";
      } else if (selectedTime < nowTime) {
        validationErrors.requiredBy =
          "The required date and time cannot be in the past. Please select a future date and time.";
      }
    }

    // 5. Notes length validation
    if (notes && notes.length > 1000) {
      validationErrors.notes = "Clinical notes cannot exceed 1,000 characters.";
    }

    // If there are any validation errors, abort and highlight
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setServerError("Please correct the highlighted validation errors before proceeding.");
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const res = await createBloodRequestAction({
        bloodGroup,
        unitsRequired: numUnits,
        urgency,
        requiredBy: requiredBy ? new Date(requiredBy).toISOString() : null,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        setServerError(res.error || "Failed to broadcast blood request. Please check your inputs.");
        setIsLoading(false);
        return;
      }

      router.push(`/hospital/blood-requests/${res.requestId}`);
      router.refresh();
    } catch {
      setServerError("An unexpected error occurred while processing the request. Please try again.");
      setIsLoading(false);
    }
  };

  const selectedBloodGroupMeta = bloodGroups.find((bg) => bg.value === bloodGroup);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl font-inter">
      {serverError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-medium flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-red-900">Request Validation Notice</p>
            <p>{serverError}</p>
          </div>
        </div>
      )}

      {/* 1. Urgency Level Selector */}
      <Card className="p-4 sm:p-6 space-y-4 bg-white border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-poppins">
            1. Select Urgency Priority <span className="text-blood-600">*</span>
          </label>
          <span className="text-[11px] text-slate-400">Controls donor broadcast speed</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {urgencyOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setUrgency(opt.value);
                setServerError(null);
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                urgency === opt.value
                  ? `${opt.color} ring-2 ring-offset-1`
                  : "border-slate-200 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-poppins font-bold text-xs sm:text-sm">{opt.title}</h4>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/80 border border-slate-200/60 mb-2">
                {opt.badge}
              </span>
              <p className="text-[11px] opacity-85 leading-relaxed font-inter">
                {opt.desc}
              </p>
            </button>
          ))}
        </div>
        {errors.urgency && (
          <p className="text-xs text-red-600 font-medium">{errors.urgency}</p>
        )}
      </Card>

      {/* 2. Blood Specifications & Quantity */}
      <Card className="p-4 sm:p-6 space-y-4 bg-white border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-poppins">
            2. Blood Specifications & Quantity <span className="text-blood-600">*</span>
          </label>
          <span className="text-[11px] text-slate-400">Verified compatibility matrix</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Blood Group Dropdown */}
          <div className="space-y-1">
            <SelectField
              id="request-blood-group"
              label="Required Blood Group *"
              value={bloodGroup}
              options={bloodGroups.map((bg) => ({ value: bg.value, label: bg.label }))}
              onChange={(e) => {
                setBloodGroup(e.target.value as BloodGroupCode);
                setServerError(null);
              }}
              required
              issueText={errors.bloodGroup}
              helperText={selectedBloodGroupMeta ? `Compatibility: ${selectedBloodGroupMeta.description}` : undefined}
            />
          </div>

          {/* Units Required Input */}
          <div>
            <TextField
              id="request-units"
              label="Units Required (Bags / 450ml) *"
              type="number"
              min={1}
              max={50}
              step={1}
              value={unitsRequired}
              onChange={(e) => handleUnitsChange(e.target.value)}
              required
              issueText={errors.unitsRequired}
              helperText="Standard adult unit volume is ~450ml (Max 50 units)"
            />
          </div>
        </div>
      </Card>

      {/* 3. Timeline & Clinical Notes */}
      <Card className="p-4 sm:p-6 space-y-4 bg-white border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider font-poppins">
            3. Timeline & Clinical Notes
          </label>
          <span className="text-[11px] text-slate-400">Strict future scheduling</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Preferred Date & Time Picker */}
          <div className="space-y-1.5">
            <TextField
              id="request-deadline"
              label="Preferred Date & Time (Deadline)"
              type="datetime-local"
              value={requiredBy}
              onChange={(e) => handleDateChange(e.target.value)}
              issueText={errors.requiredBy}
              helperText={
                errors.requiredBy
                  ? undefined
                  : "Leave empty if required immediately. Past dates/times are disallowed."
              }
            />
            {requiredBy && !errors.requiredBy && (
              <div className="flex items-center gap-1.5 text-[11px] text-green-700 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span>Scheduled for: {new Date(requiredBy).toLocaleString()}</span>
              </div>
            )}
          </div>

          {/* Clinical / Case Notes Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-700">
                Operational / Patient Case Notes (Optional)
              </label>
              <span className="text-[10px] text-slate-400">
                {notes.length}/1000
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={1000}
              placeholder="e.g. Ward 4 Emergency Theater, patient prepped for C-section, crossmatch in progress"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setServerError(null);
                if (e.target.value.length > 1000) {
                  setErrors((prev) => ({
                    ...prev,
                    notes: "Clinical notes cannot exceed 1,000 characters.",
                  }));
                } else {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.notes;
                    return next;
                  });
                }
              }}
              className={`w-full px-3.5 py-2 rounded-xl border text-xs text-dark focus:outline-hidden focus:ring-2 focus:ring-blood-500 transition-all ${
                errors.notes ? "border-red-400 ring-1 ring-red-400" : "border-slate-200"
              }`}
            />
            {errors.notes && (
              <p className="text-xs text-red-600 font-medium">{errors.notes}</p>
            )}
          </div>
        </div>
      </Card>

      {/* 4. Submission Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Activity className="w-4 h-4 text-blood-600 shrink-0" />
          <span>ORBINOVA will match verified donors within radius and notify available candidates.</span>
        </div>

        <Button
          type="submit"
          variant="blood"
          size="lg"
          isLoading={isLoading}
          loadingText="Submitting Request..."
          leftIcon={<Send className="w-4 h-4" />}
          className="font-bold shadow-sm w-full sm:w-auto"
        >
          Submit Blood Request
        </Button>
      </div>
    </form>
  );
}
