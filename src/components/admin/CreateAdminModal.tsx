"use client";

import React, { useState } from "react";
import { Modal, Input, Select, Button } from "@/components/ui";
import { createAdminAction } from "@/actions/adminActions";
import { AdminRole } from "@/types/database";
import { ShieldCheck, User, Mail, Lock, Phone } from "lucide-react";

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateAdminModal: React.FC<CreateAdminModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [adminRole, setAdminRole] = useState<AdminRole>("admin");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await createAdminAction({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        adminRole,
        phone: phone.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to create administrator.");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      onClose();
      onSuccess?.();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Administrator"
      description="Provision a verified administrative account with designated system permissions."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs animate-fadeIn">
            {errorMessage}
          </div>
        )}

        <Input
          label="Full Name *"
          placeholder="Dr. Folake Adeleke"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          leftIcon={<User className="w-4 h-4 text-slate-400" />}
        />

        <Input
          label="Work Email Address *"
          type="email"
          placeholder="folake@smartdonor.ng"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Temporary Password *"
            type="password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
          />

          <Input
            label="Phone Number"
            type="tel"
            placeholder="08012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <Select
          label="Administrator Role / Clearance *"
          value={adminRole}
          onChange={(e) => setAdminRole(e.target.value as AdminRole)}
          options={[
            { value: "superadmin", label: "Super Admin (Full Clearance & Root Governance)" },
            { value: "admin", label: "Administrator (Facility & Registry Management)" },
            { value: "staff", label: "Staff (Operations & Logistics Support)" },
          ]}
          required
        />

        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
          <span>
            This administrator will be able to access the admin portal at <code className="bg-slate-200/80 px-1 py-0.5 rounded">/admin</code> using their email and assigned credentials.
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" isLoading={isLoading} loadingText="Creating...">
            Create Administrator
          </Button>
        </div>
      </form>
    </Modal>
  );
};
