"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface PortalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PortalError({ error, reset }: PortalErrorProps) {
  useEffect(() => {
    console.error("[Portal Error Boundary caught]:", error.message);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4 font-inter">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-6 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h1 className="font-poppins font-bold text-xl text-slate-900">
            Action or Page Error
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            {error.message || "An unexpected error occurred while loading this section."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => reset()}
            className="w-full sm:w-auto font-semibold"
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Retry Action
          </Button>

          <Link href="/hospital/dashboard" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              className="w-full sm:w-auto font-semibold text-slate-700"
              leftIcon={<LayoutDashboard className="w-4 h-4" />}
            >
              Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
