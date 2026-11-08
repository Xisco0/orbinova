"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  Building,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import { updateHospitalPersonalProfileAction } from "@/actions/staffActions";
import { Button } from "@/components/ui";

interface EditPersonalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFullName: string;
  initialPhone?: string | null;
  email: string;
  roleLabel: string;
  organizationName: string;
  onSuccess: (updated: { fullName: string; phone?: string }) => void;
}

export const EditPersonalProfileModal: React.FC<EditPersonalProfileModalProps> = ({
  isOpen,
  onClose,
  initialFullName,
  initialPhone,
  email,
  roleLabel,
  organizationName,
  onSuccess,
}) => {
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFullName(initialFullName);
      setPhone(initialPhone || "");
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialFullName, initialPhone]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Please enter a valid full name.");
      return;
    }

    setLoading(true);

    let res: any;
    try {
      res = await updateHospitalPersonalProfileAction({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      });
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Failed to update profile.");
      return;
    }

    setLoading(false);

    if (!res || !res.success) {
      setError(res?.error || "Failed to update profile.");
      return;
    }

    setSuccessMsg("Personal profile updated successfully.");
    onSuccess({
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
    });

    setTimeout(() => {
      onClose();
    }, 600);
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-personal-profile-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="edit-personal-profile-title"
                className="font-poppins font-bold text-base text-dark tracking-tight"
              >
                Update Personal Profile
              </h2>
              <p className="text-xs text-slate-500 font-inter">
                Update your administrative name and contact details
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl font-medium animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Facility & Role Information Badge */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs font-inter">
            <div className="flex items-center gap-2 min-w-0">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-700 truncate">{organizationName}</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-primary-100 text-primary-800 font-bold text-[11px] shrink-0 whitespace-nowrap">
              {roleLabel}
            </span>
          </div>

          {/* Full Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-inter">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Chief Medical Officer"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-inter text-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
          </div>

          {/* Email (Read-Only) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-inter">
              Official Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                disabled
                value={email}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-inter text-slate-600 cursor-not-allowed select-none"
              />
            </div>
            <p className="text-[11px] text-slate-400 font-inter">
              Primary login identity managed by platform administration.
            </p>
          </div>

          {/* Phone Number Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider font-inter">
              Contact Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +234 800 123 4567"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-inter text-dark placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              className="text-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? "Saving..." : "Save Changes"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
