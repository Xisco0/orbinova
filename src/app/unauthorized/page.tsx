"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogIn, Heart, Building2, ShieldCheck } from "lucide-react";
import { Button, Card, Logo } from "@/components/ui";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const required = searchParams.get("required");

  const getExplanation = () => {
    if (reason === "inactive") {
      return {
        title: "Account Inactive",
        description:
          "Your account has been deactivated or is currently undergoing administrative review. Please contact support to reactivate your access.",
      };
    }
    if (required === "admin") {
      return {
        title: "Admin Clearance Required",
        description:
          "The requested page is restricted to system administrators. Your account does not have sufficient clearance to access this area.",
      };
    }
    if (required === "organization") {
      return {
        title: "Healthcare Organization Portal",
        description:
          "This portal is exclusively accessible to authorized Hospital and Blood Bank personnel.",
      };
    }
    if (required === "donor") {
      return {
        title: "Donor Portal Access Only",
        description:
          "This area is reserved for individual blood donors. Organization staff should use their dedicated portal.",
      };
    }
    return {
      title: "Access Restricted",
      description:
        "You do not have permission to view this resource. Please navigate to your designated portal or switch accounts.",
    };
  };

  const { title, description } = getExplanation();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <header className="px-6 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo variant="horizontal" size="md" href="/" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <Card className="w-full max-w-lg shadow-lg border-slate-200/80 bg-white p-6 sm:p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center border border-amber-200">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
              403 • Authorization Denied
            </span>
            <h1 className="font-poppins text-2xl font-bold text-dark pt-2">
              {title}
            </h1>
            <p className="text-sm text-slate-600 font-inter max-w-md mx-auto">
              {description}
            </p>
          </div>

          {/* Quick Portals Navigation */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-3 font-inter">
              Navigate to your authorized portal:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <Link
                href="/hospital"
                className="p-3 rounded-xl border border-slate-200 hover:border-primary-400 hover:bg-primary-50/50 transition-all flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-dark font-poppins">
                    Hospital / Blood Bank
                  </h4>
                  <p className="text-[11px] text-slate-500 font-inter">
                    /hospital portal
                  </p>
                </div>
              </Link>

              <Link
                href="/donor"
                className="p-3 rounded-xl border border-slate-200 hover:border-blood-400 hover:bg-blood-50/50 transition-all flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-blood-100 text-blood-700 flex items-center justify-center shrink-0">
                  <Heart className="w-5 h-5 fill-blood-600" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-dark font-poppins">
                    Blood Donor
                  </h4>
                  <p className="text-[11px] text-slate-500 font-inter">
                    /donor portal
                  </p>
                </div>
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => window.history.back()}
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Go Back
            </Button>
            <Link href="/login">
              <Button
                variant="primary"
                size="md"
                leftIcon={<LogIn className="w-4 h-4" />}
              >
                Sign In with Different Account
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      <footer className="py-4 text-center text-xs text-slate-400 font-inter">
        SmartDonor Security & Role Authorization Layer
      </footer>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Checking authorization...</div>}>
      <UnauthorizedContent />
    </Suspense>
  );
}
