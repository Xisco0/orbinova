"use client";

import React, { useState } from "react";
import { Modal, Input, Select, Button } from "@/components/ui";
import { onboardDonorAction } from "@/actions/adminActions";
import { BloodGroupCode } from "@/types/database";
import { Heart, User, Mail, Lock, Phone, MapPin, Calendar } from "lucide-react";

interface OnboardDonorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const OnboardDonorModal: React.FC<OnboardDonorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState<BloodGroupCode>("O+");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [city, setCity] = useState("Lagos");
  const [state, setState] = useState("Lagos");
  const [address, setAddress] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage("Full name, email, and password are required.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await onboardDonorAction({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        bloodGroup,
        dateOfBirth: dateOfBirth || undefined,
        gender,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        address: address.trim() || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to onboard donor.");
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
      title="Onboard Voluntary Blood Donor"
      description="Register and activate a voluntary donor on the SmartDonor emergency match pool."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto px-1">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs animate-fadeIn">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Full Name *"
            placeholder="e.g. Samuel Adeleke"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            leftIcon={<User className="w-4 h-4 text-slate-400" />}
          />

          <Input
            label="Email Address *"
            type="email"
            placeholder="samuel@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Account Password *"
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
            placeholder="08023456789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4 text-slate-400" />}
          />

          <Select
            label="Blood Group *"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value as BloodGroupCode)}
            options={[
              { value: "O+", label: "O+ (Universal RBC)" },
              { value: "O-", label: "O- (Universal Donor)" },
              { value: "A+", label: "A+" },
              { value: "A-", label: "A-" },
              { value: "B+", label: "B+" },
              { label: "B-", value: "B-" },
              { label: "AB+", value: "AB+" },
              { label: "AB-", value: "AB-" },
            ]}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Date of Birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            leftIcon={<Calendar className="w-4 h-4 text-slate-400" />}
          />

          <Select
            label="Biological Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as any)}
            options={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "other", label: "Other" },
            ]}
          />

          <Input
            label="City"
            placeholder="e.g. Yaba"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            leftIcon={<MapPin className="w-4 h-4 text-slate-400" />}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="State"
            placeholder="e.g. Lagos"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
          <Input
            label="Residential Address"
            placeholder="Street address or landmark"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="blood" size="sm" isLoading={isLoading} loadingText="Onboarding...">
            Onboard Donor Hero
          </Button>
        </div>
      </form>
    </Modal>
  );
};
