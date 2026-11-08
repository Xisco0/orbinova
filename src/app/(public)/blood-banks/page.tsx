import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Building2, Package, Droplet, ShieldCheck, CheckCircle2, Activity, History, Users, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ModuleAccessButton } from "@/components/ui/ModuleAccessButton";

export const metadata: Metadata = {
  title: "For Blood Banks | ORBINOVA Blood Inventory & Supply Coordination",
  description:
    "Empower certified blood banks and transfusion centers to manage blood inventory, issue units to hospitals, and match voluntary donors.",
};

export default function BloodBanksPublicPage() {
  return (
    <div className="space-y-12 sm:space-y-24 py-8 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-inter">
      {/* 1. Header Hero */}
      <section className="text-center space-y-4 sm:space-y-6 max-w-3xl mx-auto" data-aos="fade-up">
        <Badge variant="primary" size="sm">
          Transfusion & Blood Banks
        </Badge>
        <h1 className="font-poppins text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Manage Blood Inventory & <br className="hidden sm:inline" />
          <span className="text-teal-700">Coordinate Regional Supply.</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          ORBINOVA Donor provides certified blood banks with real-time stock control, voluntary donor
          mobilization, and seamless blood product issuance for partner healthcare facilities.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <ModuleAccessButton
            module="donor"
            size="lg"
            label="Access ORBINOVA Donor"
            className="w-full sm:w-auto"
          />
          <Link href="/how-it-works" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto font-semibold text-sm border-slate-300 text-slate-700"
            >
              How It Works
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. Blood Bank Core Workflows */}
      <section className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="primary" size="sm">
            Transfusion Logistics
          </Badge>
          <h2 className="font-poppins text-2xl sm:text-3xl font-bold text-slate-900">
            Tailored for Blood Centers & Transfusion Services
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Maintain safe stock thresholds and activate voluntary donors before critical shortages occur.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Multi-Group Stock Control
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Track real-time inventory balances across all 8 blood groups (whole blood, packed red cells) with automatic low-stock warning indicators.
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blood-50 text-blood-600 flex items-center justify-center font-bold">
              <Droplet className="w-5 h-5 fill-blood-600" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Donor Mobilization Drives
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Initiate replenishment requests to mobilize verified voluntary donors in your district when rare or high-demand blood types run low.
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Issuance & Transfer Logs
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Maintain an immutable audit trail of blood units received from donors, issued to hospitals, reserved for surgeries, or adjusted.
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Incoming Donation Processing
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Record voluntary donor arrivals, log collected units, and automatically credit units to stock balances with full batch traceability.
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Geodesic Proximity Matching
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Ensure donors dispatched are within convenient travel distance to your blood bank collection center or mobile clinic site.
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Verified Facility Security
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every blood bank account is verified by platform administrators before activation, maintaining high trust and data protection.
            </p>
          </Card>
        </div>
      </section>

      {/* 3. Portal Sign In CTA */}
      <section className="text-center space-y-4 pt-4 border-t border-slate-200">
        <h3 className="font-poppins font-bold text-2xl text-slate-900">
          Access Your Blood Bank Portal
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Sign in to manage your center&apos;s inventory, track transactions, and coordinate voluntary donor dispatches.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button
              variant="secondary"
              size="lg"
              className="font-semibold shadow-md bg-teal-700 hover:bg-teal-800 text-white"
            >
              Blood Bank Portal Sign In
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
