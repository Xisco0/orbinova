"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { TextField } from "@/components/ui/text-field";
import { AjoNovaTextarea } from "@/components/ui/ajonova-textarea";
import { SelectField } from "@/components/ui/select-field";
import { Button } from "@/components/ui/Button";
import { submitContactInquiryAction, ContactFormData } from "./actions";

export const ContactForm: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    fullName: "",
    email: "",
    organization: "",
    category: "general",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await submitContactInquiryAction(formData);
      if (res.success) {
        setSuccessMessage(res.message);
        setFormData({
          fullName: "",
          email: "",
          organization: "",
          category: "general",
          subject: "",
          message: "",
        });
      } else {
        if (res.errors) {
          setErrors(res.errors);
        }
        setErrorMessage(res.message);
      }
    } catch (err: any) {
      setErrorMessage("Failed to send message. Please check your network connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: "general", label: "General Information & Inquiry" },
    { value: "donor_support", label: "Voluntary Donor Support" },
    { value: "hospital_onboarding", label: "Hospital / Blood Bank Verification" },
    { value: "technical_issue", label: "Technical Support / Portal Help" },
    { value: "partnership", label: "Healthcare Partnership & Integration" },
  ];

  if (successMessage) {
    return (
      <div className="p-8 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-4 animate-in fade-in">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="font-poppins font-bold text-lg text-emerald-900">
          Message Sent Successfully
        </h3>
        <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed max-w-md mx-auto">
          {successMessage}
        </p>
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSuccessMessage(null)}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
          >
            Send Another Message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-inter text-left">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-blood-50 border border-blood-200 text-xs text-blood-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-blood-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          id="contact-fullName"
          label="Your Full Name"
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          error={errors.fullName}
          required
        />

        <TextField
          id="contact-email"
          label="Email Address"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          error={errors.email}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField
          id="contact-organization"
          label="Hospital or Organization (Optional)"
          value={formData.organization}
          onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
        />

        <SelectField
          id="contact-category"
          label="Inquiry Category"
          options={categoryOptions}
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          error={errors.category}
          required
        />
      </div>

      <TextField
        id="contact-subject"
        label="Subject"
        value={formData.subject}
        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
        error={errors.subject}
        required
      />

      <AjoNovaTextarea
        id="contact-message"
        label="Detailed Message"
        rows={5}
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        error={errors.message}
        required
      />

      <div className="pt-2">
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full sm:w-auto font-semibold shadow-sm"
          disabled={isSubmitting}
          leftIcon={
            isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )
          }
        >
          {isSubmitting ? "Sending Message..." : "Submit Inquiry"}
        </Button>
      </div>
    </form>
  );
};
