import React from "react";
import Link from "next/link";
import { ArrowLeft, Home, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-inter text-slate-800 p-4 sm:p-8">
      <div className="max-w-7xl w-full mx-auto flex justify-start">
        <Logo variant="horizontal" size="md" href="/" />
      </div>

      <div className="max-w-md w-full mx-auto text-center space-y-6 my-auto py-12">
        <div className="w-16 h-16 rounded-3xl bg-blood-50 text-blood-600 flex items-center justify-center font-poppins font-extrabold text-2xl mx-auto border border-blood-100 shadow-sm">
          404
        </div>

        <div className="space-y-2">
          <h1 className="font-poppins font-bold text-2xl text-slate-900">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            The page you are looking for does not exist, has been moved, or requires appropriate authorization.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="md"
              className="w-full sm:w-auto font-semibold"
              leftIcon={<Home className="w-4 h-4" />}
            >
              Back to Home
            </Button>
          </Link>
          <Link href="/faq" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="md"
              className="w-full sm:w-auto font-semibold text-slate-700"
              leftIcon={<HelpCircle className="w-4 h-4" />}
            >
              Visit FAQ
            </Button>
          </Link>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 py-4">
        SmartDonor &bull; Blood Donor Matching System
      </div>
    </div>
  );
}
