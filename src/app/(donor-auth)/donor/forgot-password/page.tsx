"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, Heart, ArrowRight } from "lucide-react";
import { Button, Input, Card, useToast, Logo } from "@/components/ui";

export default function DonorForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setErrorMessage("Please enter your registered donor email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrimmed)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed, portalScope: "donor" }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok && res.status !== 200) {
        const errorText = data.error || "Unable to process password reset request. Please try again.";
        setErrorMessage(errorText);
        toast.error("Request Failed", errorText);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      toast.info(
        "Instructions Sent",
        "If an account exists with this email address, password reset instructions will be sent shortly."
      );
    } catch {
      setErrorMessage("Network error. Please verify your connection and try again.");
      toast.error("Network Error", "Unable to reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex justify-center mb-6">
        <Logo variant="horizontal" size="md" href="/" />
      </div>

      <Card className="shadow-xl border-slate-200/80 bg-white p-6 sm:p-8 rounded-2xl">
        <div className="text-center space-y-2 mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blood-50 text-blood-600 mb-1 border border-blood-100 shadow-xs">
            <Heart className="w-6 h-6 fill-blood-500 text-blood-500" />
          </div>
          <h1 className="font-poppins text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Forgot Password?
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
            Enter the email address associated with your ORBINOVA account. If an account exists, we will send you instructions to reset your password.
          </p>
        </div>

        {isSuccess ? (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h3 className="font-poppins text-base font-semibold text-slate-900">
                Check Your Email
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
                If an account exists with <strong className="text-slate-900 font-mono">{email}</strong>, password reset instructions will be sent shortly.
              </p>
              <p className="text-[11px] text-slate-400 font-inter pt-1">
                The password reset link is single-use and will expire in 20 minutes.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setIsSuccess(false)}
                className="text-xs font-semibold"
              >
                Send to Another Email
              </Button>

              <div>
                <Link
                  href="/donor/login"
                  className="inline-flex items-center text-xs font-semibold text-blood-600 hover:text-blood-700 hover:underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Donor Sign In
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-blood-50 border border-blood-200 text-blood-700 text-xs sm:text-sm font-inter animate-fadeIn"
              >
                {errorMessage}
              </div>
            )}

            <Input
              label="Donor Email Address"
              type="email"
              placeholder="donor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={isLoading}
              helperText="Enter your registered voluntary donor email"
            />

            <Button
              type="submit"
              variant="blood"
              size="lg"
              fullWidth
              isLoading={isLoading}
              loadingText="Sending reset link..."
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="font-poppins font-bold text-sm shadow-sm py-2.5"
            >
              Send Reset Link
            </Button>

            <div className="text-center pt-4 border-t border-slate-100">
              <Link
                href="/donor/login"
                className="inline-flex items-center text-xs font-semibold text-blood-600 hover:text-blood-700 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Donor Sign In
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
