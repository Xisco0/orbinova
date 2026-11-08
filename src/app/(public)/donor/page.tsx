import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Heart, Droplet, ShieldCheck, CheckCircle2, Clock, Sliders, History, Lock, ArrowRight, Activity } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ModuleAccessButton } from "@/components/ui/ModuleAccessButton";
import { FAQAccordion, FAQItem } from "@/components/public/FAQAccordion";

export const metadata: Metadata = {
  title: "For Voluntary Donors | ORBINOVA Donor Coordination",
  description:
    "Register as a voluntary blood donor with authorized healthcare facilities. Receive targeted hospital blood requests matching your blood type with complete privacy control.",
};

const DONOR_FAQS: FAQItem[] = [
  {
    id: "donor-1",
    question: "Who can register as a voluntary blood donor?",
    answer:
      "Generally, healthy adults between 18 and 65 years of age weighing at least 50 kg can register. Medical eligibility and final screening are performed by certified clinical personnel at the donation facility before every donation.",
  },
  {
    id: "donor-2",
    question: "Will my contact information or location be publicly searchable?",
    answer:
      "No. ORBINOVA Donor operates under strict privacy protections. Your name, phone number, email, and exact location are never publicly displayed, searchable, or shared with third parties. Only authorized hospital personnel managing a request you accept can contact you for donation scheduling.",
  },
  {
    id: "donor-3",
    question: "Can I control when I am available to receive requests?",
    answer:
      "Yes. You can toggle your availability status between 'Available' and 'Unavailable' at any time from your donor dashboard. When marked unavailable, the matching engine will not dispatch new requests to you.",
  },
  {
    id: "donor-4",
    question: "What happens if I decline a blood request?",
    answer:
      "There is no penalty for declining a request. If you are busy, unwell, or unable to donate, you can simply tap 'Decline' so the system can promptly notify the next eligible candidate.",
  },
  {
    id: "donor-5",
    question: "How often can I donate blood?",
    answer:
      "In standard clinical practice, whole blood donors should observe a minimum recovery interval of 90 days (3 months) between donations. The donor dashboard includes a recovery tracker to help you observe safe intervals.",
  },
];

export default function PublicDonorLandingPage() {
  return (
    <div className="space-y-12 sm:space-y-24 py-8 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-inter">
      {/* 1. Donor Hero */}
      <section className="text-center space-y-4 sm:space-y-6 max-w-3xl mx-auto" data-aos="fade-up">
        <Badge variant="blood" size="sm">
          Voluntary Blood Donors
        </Badge>
        <h1 className="font-poppins text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
          Your Blood Group Can <br className="hidden sm:inline" />
          <span className="text-blood-600">Save a Life in Your City.</span>
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Join the network of voluntary blood donors coordinated through verified healthcare facilities.
          Get notified only when nearby verified hospitals need your specific blood type.
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

      {/* 2. Why Voluntary Donation Matters & How SmartDonor Helps */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
        <Card className="p-5 sm:p-8 bg-white border-slate-200/80 space-y-4 flex flex-col justify-between" data-aos="fade-right" data-aos-delay="100">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blood-50 text-blood-600 flex items-center justify-center font-bold">
              <Heart className="w-5 h-5 fill-blood-600" />
            </div>
            <h2 className="font-poppins text-xl font-bold text-slate-900">
              Why Voluntary Donation Matters
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every day in Nigeria, mothers in labor, accident victims, surgical patients, and individuals living with sickle cell or cancer require urgent blood transfusions. Regular voluntary blood donation provides the safest, most reliable foundation for clinical care.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-blood-50/60 border border-blood-100 text-xs text-blood-900">
            A single whole blood donation can be separated into red cells, plasma, and platelets, supporting multiple patients in need.
          </div>
        </Card>

        <Card className="p-6 sm:p-8 bg-white border-slate-200/80 space-y-4 flex flex-col justify-between" data-aos="fade-left" data-aos-delay="200">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <h2 className="font-poppins text-xl font-bold text-slate-900">
              How SmartDonor Helps You
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Instead of uncoordinated emergency broadcasts, SmartDonor contacts you only when a verified hospital in your area submits a matching request for your blood type. You receive clear details on clinical urgency, location, and required response window.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-primary-50/60 border border-primary-100 text-xs text-primary-900">
            No endless broadcasts or irrelevant messages — just targeted, actionable, lifesaving alerts.
          </div>
        </Card>
      </section>

      {/* 3. What Donors Can Manage */}
      <section className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 lg:p-12 shadow-xs space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="primary" size="sm">
            Self-Service Control
          </Badge>
          <h2 className="font-poppins text-2xl sm:text-3xl font-bold text-slate-900">
            Everything You Need in Your Portal
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Your dedicated donor portal gives you full visibility and complete autonomy over your participation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
            <Sliders className="w-5 h-5 text-blood-600" />
            <h3 className="font-poppins font-bold text-sm text-slate-900">Availability Management</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Toggle your status to available, busy, or temporarily unavailable whenever your schedule changes.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
            <Droplet className="w-5 h-5 text-blood-600" />
            <h3 className="font-poppins font-bold text-sm text-slate-900">Blood Profile</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Store your ABO/Rh blood group and optional genotype to ensure precision matching.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
            <History className="w-5 h-5 text-blood-600" />
            <h3 className="font-poppins font-bold text-sm text-slate-900">Donation History</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Keep verified records of your past donations, host hospitals, and total units contributed.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
            <Clock className="w-5 h-5 text-blood-600" />
            <h3 className="font-poppins font-bold text-sm text-slate-900">Recovery Cooldown</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Automated 90-day cooldown trackers protect your health between whole blood donations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
            <Lock className="w-5 h-5 text-blood-600" />
            <h3 className="font-poppins font-bold text-sm text-slate-900">Private & Protected</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your exact coordinates and personal details remain encrypted and non-public.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
            <CheckCircle2 className="w-5 h-5 text-blood-600" />
            <h3 className="font-poppins font-bold text-sm text-slate-900">Instant Requests</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              View hospital requests with one-tap accept or decline buttons right from your dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Donor FAQ Accordion */}
      <section className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <Badge variant="primary" size="sm">
            Questions & Answers
          </Badge>
          <h2 className="font-poppins text-2xl sm:text-3xl font-bold text-slate-900">
            Frequently Asked Questions for Donors
          </h2>
        </div>
        <FAQAccordion items={DONOR_FAQS} />
      </section>

      {/* 5. Bottom Registration Callout */}
      <section className="text-center space-y-4 pt-8 border-t border-slate-200">
        <h3 className="font-poppins font-bold text-2xl text-slate-900">
          Ready to become a voluntary donor?
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Registration takes less than two minutes. Help hospitals in your area be prepared when emergencies occur.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/donor/register">
            <Button variant="blood" size="lg" className="font-semibold shadow-md">
              Create Your Donor Account
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
