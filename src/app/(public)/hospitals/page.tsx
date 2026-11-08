import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Building2, Droplet, ShieldCheck, Activity, Package, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ModuleAccessButton } from "@/components/ui/ModuleAccessButton";

export const metadata: Metadata = {
  title: "For Hospitals | ORBINOVA Donor Healthcare Coordination",
  description:
    "Enable your hospital clinical staff to create urgent blood requests, match compatible voluntary donors, and track fulfillment in real-time.",
};

export default function HospitalsPublicPage() {
  return (
    <div className="space-y-12 sm:space-y-24 py-8 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-inter">
      {/* 1. Header Hero */}
      <section className="text-center space-y-4 sm:space-y-6 max-w-3xl mx-auto" data-aos="fade-up">
        <Badge variant="primary" size="sm">
          Healthcare Facilities
        </Badge>
        <h1 className="font-poppins text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Streamline Blood Supply <br className="hidden sm:inline" />
          <span className="text-primary-600">& Emergency Donor Matching.</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          ORBINOVA Donor equips hospital clinical teams, emergency wards, and blood banks with modern
          digital tools to triage blood shortages and coordinate matching voluntary donors.
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
              View Workflow
            </Button>
          </Link>
        </div>
      </section>

      {/* 2. Key Operational Capabilities */}
      <section className="space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="primary" size="sm">
            Clinical Tools
          </Badge>
          <h2 className="font-poppins text-2xl sm:text-3xl font-bold text-slate-900">
            Engineered for Fast-Paced Medical Teams
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Everything your hospital needs to manage blood requirements from one unified interface.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blood-50 text-blood-600 flex items-center justify-center font-bold">
              <Droplet className="w-5 h-5 fill-blood-600" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Rapid Request Creation
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Create emergency or routine blood requests in seconds. Specify ABO/Rh requirements, needed units, and clinical deadlines with full audit tracking.
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              4-Factor Smart Matching
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Our deterministic algorithm matches red-cell compatible, eligible donors within your hospital&apos;s geographic area, ranking them by distance and availability.
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Live Response Monitoring
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Watch real-time donor responses on your request dashboard. Track accepted donors and estimated arrival times for incoming donations.
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Blood Stock & Inventory
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Monitor your facility&apos;s on-hand blood inventory across all 8 blood groups with expiration alerts and transaction logging.
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Multi-Staff Collaboration
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Invite and manage laboratory scientists, hematologists, and nursing staff with role-based permissions (Owner, Manager, Staff).
            </p>
          </Card>

          <Card className="p-6 bg-white border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-poppins font-bold text-base text-slate-900">
              Clinical Data Security
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Strict organization isolation ensures your hospital&apos;s patient requests and inventory are accessible only to verified members of your facility.
            </p>
          </Card>
        </div>
      </section>

      {/* 3. Clinical Responsibility Disclaimer */}
      <section className="p-6 sm:p-8 bg-slate-100 rounded-2xl border border-slate-200 text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2">
        <h4 className="font-poppins font-bold text-slate-900 text-sm">
          Notice for Clinical Healthcare Providers
        </h4>
        <p>
          SmartDonor is a coordination and logistics support platform. All cross-matching, transfusion compatibility testing, screening for transfusion-transmissible infections (TTIs), and clinical donor qualification remain subject to standard medical laboratory procedures and applicable national health regulations.
        </p>
      </section>

      {/* 4. Portal CTA */}
      <section className="text-center space-y-4 pt-4 border-t border-slate-200">
        <h3 className="font-poppins font-bold text-2xl text-slate-900">
          Access Your Organization Portal
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Sign in to your verified hospital account to manage blood requests and inventory.
        </p>
        <div className="pt-2">
          <Link href="/login">
            <Button variant="primary" size="lg" className="font-semibold shadow-md">
              Hospital Portal Sign In
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
