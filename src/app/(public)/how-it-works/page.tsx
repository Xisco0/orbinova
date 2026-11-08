import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Heart, Building2, ShieldCheck, CheckCircle2, Clock, Compass, ArrowRight, Sliders, Users, Activity, FileCheck2, Droplet, BellRing, Lock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "How It Works | ORBINOVA Healthcare Coordination & Intelligence",
  description:
    "Explore the step-by-step lifecycles for healthcare facilities, donor coordination, and AI-assisted imaging workflows on ORBINOVA.",
};

export default function HowItWorksPage() {
  return (
    <div className="space-y-12 sm:space-y-24 py-8 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-inter">
      {/* Top Banner */}
      <section className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto" data-aos="fade-up">
        <Badge variant="primary" size="sm">
          Platform Workflows
        </Badge>
        <h1 className="font-poppins text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          How ORBINOVA Works
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          A transparent, step-by-step walkthrough of how healthcare facilities, blood donor networks,
          and diagnostic teams coordinate through ORBINOVA.
        </p>
      </section>

      {/* 1. Donor Lifecycle (8 Steps) */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-10 lg:p-12 shadow-xs space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-5 h-5 fill-blood-600 text-blood-600" />
              <Badge variant="blood" size="sm">
                Voluntary Donor Journey
              </Badge>
            </div>
            <h2 className="font-poppins text-2xl font-bold text-slate-900">
              The Donor Experience
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              From registration to receiving lifesaving request notifications
            </p>
          </div>
          <Link href="/donor/register">
            <Button variant="blood" size="sm" className="font-semibold shadow-xs">
              Register as a Donor
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blood-100 text-blood-700 font-bold text-xs flex items-center justify-center font-mono">
              1
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">1. Register Account</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sign up securely using your email address and create a private password.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blood-100 text-blood-700 font-bold text-xs flex items-center justify-center font-mono">
              2
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">2. Complete Profile</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Add your name, telephone number, city, state, and optional genotype.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blood-100 text-blood-700 font-bold text-xs flex items-center justify-center font-mono">
              3
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">3. Provide Blood Group</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Specify your confirmed ABO/Rh blood group (e.g. O+, O-, A+, B+).
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blood-100 text-blood-700 font-bold text-xs flex items-center justify-center font-mono">
              4
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">4. Manage Availability</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Toggle your availability switch anytime you are busy or traveling.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blood-100 text-blood-700 font-bold text-xs flex items-center justify-center font-mono">
              5
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">5. Maintain Eligibility</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Review recovery intervals and basic health criteria in your portal.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blood-100 text-blood-700 font-bold text-xs flex items-center justify-center font-mono">
              6
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">6. Receive Requests</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Get notified when a nearby hospital requests your compatible blood type.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-blood-100 text-blood-700 font-bold text-xs flex items-center justify-center font-mono">
              7
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">7. Accept or Decline</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Review hospital details and respond. Declining carries no penalty.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center font-mono">
              8
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">8. Track Impact</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              View verified donation receipts and cooldown timers for future donations.
            </p>
          </div>
        </div>
      </section>

      {/* 2. Hospital / Blood Bank Lifecycle (8 Steps) */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 lg:p-12 shadow-xs space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-5 h-5 text-primary-600" />
              <Badge variant="primary" size="sm">
                Healthcare Facility Journey
              </Badge>
            </div>
            <h2 className="font-poppins text-2xl font-bold text-slate-900">
              The Hospital & Blood Bank Experience
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              From blood request triage to smart matching and inventory fulfillment
            </p>
          </div>
          <Link href="/login">
            <Button variant="primary" size="sm" className="font-semibold shadow-xs">
              Facility Sign In
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center font-mono">
              1
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">1. Staff Sign In</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Authorized clinical personnel sign in to their organization&apos;s workspace.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center font-mono">
              2
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">2. Create Request</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Specify blood group, required units, urgency (Emergency, Urgent, Normal), and deadline.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center font-mono">
              3
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">3. Server-Side Matching</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              The matching engine filters eligible candidates and calculates 4-factor ranking scores.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center font-mono">
              4
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">4. Staged Selection</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Top-ranked candidates are selected in balanced batches according to unit needs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center font-mono">
              5
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">5. Donor Dispatch</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Notifications are sent immediately to selected candidates with response deadlines.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center font-mono">
              6
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">6. Realtime Tracking</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Staff watch live acceptance, decline, and pending statuses on the request dashboard.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center font-mono">
              7
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">7. Record Donation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              When a donor arrives and donates, staff verify and record the unit into inventory.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center font-mono">
              8
            </span>
            <h3 className="font-poppins font-bold text-sm text-slate-900">8. Auto-Fulfillment</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Once required units are reached, the request marks fulfilled and notifies remaining pending candidates.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Server-Side Security Note */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex items-start gap-4">
        <Lock className="w-6 h-6 text-primary-400 shrink-0 mt-1" />
        <div className="space-y-1 text-xs sm:text-sm font-inter">
          <h3 className="font-poppins font-bold text-base text-white">
            Server-Side Matching Security Guarantee
          </h3>
          <p className="text-slate-300 leading-relaxed">
            All candidate matching, ranking calculations, distance evaluations, and notification dispatches execute securely inside server-side actions protected by Supabase PostgreSQL Row Level Security. Private coordinates and personal records are never passed to browser client code.
          </p>
        </div>
      </section>
    </div>
  );
}
