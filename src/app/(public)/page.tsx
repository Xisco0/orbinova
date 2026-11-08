import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { Heart, Building2, ShieldCheck, CheckCircle2, ScanLine, Activity, Droplet, Cpu, ArrowRight, ExternalLink, Layers, FileCheck2, Microscope, Stethoscope, Lock, Compass, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ModuleAccessButton } from "@/components/ui/ModuleAccessButton";
import { HeroVisual } from "@/components/public/HeroVisual";
import { BRAND } from "@/constants/theme";

const productionDomain =
  process.env.NEXT_PUBLIC_APP_URL &&
  !process.env.NEXT_PUBLIC_APP_URL.includes("localhost") &&
  !process.env.NEXT_PUBLIC_APP_URL.includes("127.0.0.1")
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, "")
    : "https://www.orbinova.com";

const siteUrl = productionDomain;
const ogImageUrl = `${siteUrl}/orbinova-og.png`;
const canonicalUrl = `${siteUrl}/`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    absolute: "ORBINOVA | Integrated Healthcare Intelligence",
  },
  description:
    "ORBINOVA connects healthcare through technology and artificial intelligence, advancing donor matching, blood bank coordination, and AI-assisted medical imaging.",
  alternates: {
    canonical: canonicalUrl,
  },
  openGraph: {
    type: "website",
    siteName: "ORBINOVA",
    title: "ORBINOVA | Integrated Healthcare Intelligence",
    description:
      "ORBINOVA connects healthcare through technology and artificial intelligence, advancing donor matching, blood bank coordination, and AI-assisted medical imaging.",
    url: canonicalUrl,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "ORBINOVA Integrated Healthcare Intelligence platform banner.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ORBINOVA | Integrated Healthcare Intelligence",
    description:
      "ORBINOVA connects healthcare through technology and artificial intelligence, advancing donor matching, blood bank coordination, and AI-assisted medical imaging.",
    images: [
      {
        url: ogImageUrl,
        alt: "ORBINOVA Integrated Healthcare Intelligence platform banner.",
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function OrbinovaHomePage() {
  return (
    <div className="space-y-14 sm:space-y-24 lg:space-y-28 pb-14 sm:pb-20">
      {/* 1. HERO SECTION */}
      <section className="relative pt-4 sm:pt-10 lg:pt-14 pb-2 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-left" data-aos="fade-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full bg-slate-50 border border-slate-200/90 text-slate-700 text-[11px] sm:text-xs font-semibold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span>Integrated Healthcare Intelligence Platform</span>
            </div>

            <h1 className="font-poppins text-2xl xs:text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.18] sm:leading-[1.12]">
              Connecting Healthcare.{" "}
              <span className="text-primary-600 block sm:inline">Advancing Intelligence.</span>{" "}
              <span className="text-secondary-700 relative inline-block mt-1 sm:mt-0">
                Saving Lives.
                <svg
                  className="absolute -bottom-2 sm:-bottom-3 left-0 w-full"
                  height="12"
                  viewBox="0 0 240 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M3 9C65 2 175 2 237 9"
                    stroke="#0D9488"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="font-inter text-slate-600 text-sm sm:text-base lg:text-lg leading-relaxed max-w-2xl">
              ORBINOVA brings together healthcare institutions, blood donation networks, and
              AI-powered diagnostic support through a secure and integrated platform that improves
              coordination, supports clinical workflows, and advances healthcare delivery.
            </p>

            {/* Direct Dual Product Access Buttons */}
            <div className="pt-1 sm:pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <ModuleAccessButton
                module="donor"
                label="Access ORBINOVA Donor"
                subtitle="Donor Coordination & Blood Matching"
                className="w-full sm:w-auto"
              />
              <ModuleAccessButton
                module="imaging"
                label="Access ORBINOVA Imaging"
                subtitle="AI Medical Imaging & Diagnostic Support"
                className="w-full sm:w-auto"
              />
            </div>

            {/* Architecture & Security Highlights Checklist */}
            <div className="pt-2 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-y-2.5 gap-x-3.5 text-xs font-semibold text-slate-600 font-inter">
              <div className="flex items-center gap-1.5 text-slate-700">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Secure & Compliant</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Layers className="w-4 h-4 text-primary-600 shrink-0" />
                <span>Integrated & Coordinated</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Activity className="w-4 h-4 text-primary-600 shrink-0" />
                <span>AI-Powered Support</span>
              </div>
              <span className="text-slate-300 hidden sm:inline">|</span>
              <div className="flex items-center gap-1.5 text-slate-700">
                <Users className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Institution-Based Access</span>
              </div>
            </div>
          </div>

          {/* Right Hero Visual Node */}
          <div className="lg:col-span-5 flex justify-center" data-aos="fade-left" data-aos-delay="150">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* 2. PLATFORM OVERVIEW */}
      <section id="about-platform" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 max-w-3xl mx-auto mb-8 sm:mb-16" data-aos="fade-up">
          <Badge variant="primary" size="sm">
            Platform Overview
          </Badge>
          <h2 className="font-poppins text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Integrated Healthcare Intelligence
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-inter">
            Healthcare systems require structured coordination and decision-support systems that
            reduce manual friction without compromising clinical safety. ORBINOVA delivers an
            integrated ecosystem connecting critical blood logistics and intelligent diagnostic review.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3" data-aos="fade-up" data-aos-delay="100">
            <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center border border-primary-100">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="font-poppins text-base font-bold text-slate-900">
              Institution Verification
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
              Strict multi-tier onboarding verifies legitimate medical centers, hospitals, and licensed
              blood banks before access is granted.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3" data-aos="fade-up" data-aos-delay="200">
            <div className="w-12 h-12 rounded-xl bg-blood-50 text-blood-600 flex items-center justify-center border border-blood-100">
              <Droplet className="w-6 h-6" />
            </div>
            <h3 className="font-poppins text-base font-bold text-slate-900">
              Donor Coordination
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
              Rules-based ABO/Rh blood matching connects authorized facilities with eligible,
              available voluntary donors in real time.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3" data-aos="fade-up" data-aos-delay="300">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <ScanLine className="w-6 h-6" />
            </div>
            <h3 className="font-poppins text-base font-bold text-slate-900">
              Diagnostic Assistance
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
              AI-assisted imaging tools assist radiologists with anomaly prioritization while
              retaining clinician-in-the-loop oversight.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-3" data-aos="fade-up" data-aos-delay="400">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-poppins text-base font-bold text-slate-900">
              Security & Privacy
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
              Protected by isolated architecture, role-based authorization, and secure HttpOnly
              cookie session management.
            </p>
          </div>
        </div>
      </section>

      {/* 3. OUR SOLUTIONS — TWO DEDICATED PRODUCT CARDS */}
      <section id="solutions" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-3 max-w-3xl mx-auto" data-aos="fade-up">
          <Badge variant="primary" size="sm">
            Our Solutions
          </Badge>
          <h2 className="font-poppins text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Two Specialized Healthcare Modules
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-inter">
            ORBINOVA delivers specialized capabilities through two distinct, independently deployed
            applications engineered to support specific healthcare workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PRODUCT 1: ORBINOVA DONOR */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 lg:p-10 shadow-xs flex flex-col justify-between space-y-8 relative overflow-hidden group hover:border-blood-300 transition-colors" data-aos="fade-up" data-aos-delay="100">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-blood-50 border border-blood-200 flex items-center justify-center text-blood-600">
                  <Droplet className="w-7 h-7 fill-blood-600 text-blood-600" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blood-50 text-blood-700 border border-blood-200/60 font-inter">
                  Donor Coordination
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="font-poppins text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  ORBINOVA Donor
                </h3>
                <p className="text-sm sm:text-base text-slate-600 font-inter leading-relaxed">
                  A healthcare donor coordination and blood-matching platform designed to connect
                  verified healthcare institutions, eligible donors, blood banks, and patients
                  requiring blood products.
                </p>
              </div>

              {/* Key Capabilities Bullet Points */}
              <div className="space-y-2.5 pt-2 text-xs sm:text-sm font-inter text-slate-700">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blood-600 shrink-0 mt-0.5" />
                  <span>Verified healthcare facility onboarding & documentation review</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blood-600 shrink-0 mt-0.5" />
                  <span>Deterministic 4-factor ABO/Rh clinical compatibility matching</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blood-600 shrink-0 mt-0.5" />
                  <span>Real-time blood bank inventory management and expiry tracking</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blood-600 shrink-0 mt-0.5" />
                  <span>Strict clinical eligibility checks and donor health interval guidelines</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <ModuleAccessButton
                module="donor"
                size="lg"
                label="Access ORBINOVA Donor"
                fullWidth
              />
            </div>
          </div>

          {/* PRODUCT 2: ORBINOVA IMAGING */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 lg:p-10 shadow-xs flex flex-col justify-between space-y-8 relative overflow-hidden group hover:border-teal-300 transition-colors" data-aos="fade-up" data-aos-delay="200">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <ScanLine className="w-7 h-7" />
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200/60 font-inter">
                  Diagnostic Support
                </span>
              </div>

              <div className="space-y-3">
                <h3 className="font-poppins text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  ORBINOVA Imaging
                </h3>
                <p className="text-sm sm:text-base text-slate-600 font-inter leading-relaxed">
                  An AI-assisted medical imaging platform designed to support radiologists and
                  healthcare professionals in reviewing medical images, identifying potential
                  abnormalities, and prioritizing clinical review.
                </p>
              </div>

              {/* Key Capabilities Bullet Points */}
              <div className="space-y-2.5 pt-2 text-xs sm:text-sm font-inter text-slate-700">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-secondary-700 shrink-0 mt-0.5" />
                  <span>Secure medical image upload and analysis coordination</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-secondary-700 shrink-0 mt-0.5" />
                  <span>AI-assisted highlighting of potential regions of interest</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-secondary-700 shrink-0 mt-0.5" />
                  <span>Worklist prioritization for urgent clinical cases</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-secondary-700 shrink-0 mt-0.5" />
                  <span>Clinical decision support retaining qualified physician review</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <ModuleAccessButton
                module="imaging"
                size="lg"
                label="Access ORBINOVA Imaging"
                fullWidth
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. ORBINOVA DONOR DEEP-DIVE */}
      <section className="bg-slate-50/80 py-12 sm:py-20 border-y border-slate-200/70">
        <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5" data-aos="fade-right">
              <Badge variant="blood" size="sm">
                ORBINOVA Donor Architecture
              </Badge>
              <h2 className="font-poppins text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                Structured Blood Logistics & Donor Coordination
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-inter leading-relaxed">
                Emergency blood demand frequently suffers from uncoordinated manual calls and social
                media broadcasts. ORBINOVA Donor replaces ad-hoc searches with deterministic,
                auditable matching that respects clinical safety guidelines.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="font-poppins font-bold text-xs text-slate-900 block">
                    Institutional Verification
                  </span>
                  <p className="text-xs text-slate-500 font-inter leading-relaxed">
                    Donors cannot independently mark themselves verified. Only authorized healthcare
                    institutions register and verify medical screening records.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="font-poppins font-bold text-xs text-slate-900 block">
                    Strict ABO/Rh Rules
                  </span>
                  <p className="text-xs text-slate-500 font-inter leading-relaxed">
                    Matching logic enforces strict red-cell compatibility matrix rules. AI never
                    overrides mandatory clinical compatibility protocols.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="font-poppins font-bold text-xs text-slate-900 block">
                    Inventory & Expiry Control
                  </span>
                  <p className="text-xs text-slate-500 font-inter leading-relaxed">
                    Transaction-safe inventory balances prevent double-reservation, overselling, or
                    distribution of expired blood products.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
                  <span className="font-poppins font-bold text-xs text-slate-900 block">
                    Confidential Health Data
                  </span>
                  <p className="text-xs text-slate-500 font-inter leading-relaxed">
                    Personal telephone numbers and medical documents remain protected and are never
                    published publicly or searchable on the open web.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <ModuleAccessButton
                  module="donor"
                  size="md"
                  label="Access ORBINOVA Donor"
                />
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4" data-aos="fade-left" data-aos-delay="150">
              <h4 className="font-poppins font-bold text-base text-slate-900 flex items-center gap-2">
                <Droplet className="w-5 h-5 text-blood-600 fill-blood-600" />
                <span>Eligibility Status Pipeline</span>
              </h4>
              <p className="text-xs text-slate-500 font-inter">
                Every donor candidate moves through verified clinical status stages:
              </p>
              <div className="space-y-2 text-xs font-inter">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-700">Pending Verification</span>
                  <span className="text-[10px] text-slate-500">Awaiting Institutional Review</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-primary-50/50 border border-primary-100">
                  <span className="font-semibold text-primary-800">Under Medical Review</span>
                  <span className="text-[10px] text-primary-700">Lab & Screening Assessment</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                  <span className="font-semibold text-emerald-800">Verified & Eligible</span>
                  <span className="text-[10px] text-emerald-700">Active for Matched Coordination</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <span className="font-semibold text-amber-800">Temporarily Deferred</span>
                  <span className="text-[10px] text-amber-700">Recovery Interval Enforced</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ORBINOVA IMAGING DEEP-DIVE & CLINICAL SAFETY NOTICE */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-12 lg:p-16 space-y-8 relative overflow-hidden" data-aos="fade-up">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-900/60 border border-teal-700/60 text-teal-300 text-xs font-semibold">
                <ScanLine className="w-3.5 h-3.5" />
                <span>ORBINOVA Imaging Architecture</span>
              </div>

              <h2 className="font-poppins text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
                AI-Assisted Medical Imaging & Clinical Decision Support
              </h2>

              <p className="text-sm sm:text-base text-slate-300 font-inter leading-relaxed">
                ORBINOVA Imaging is developed to assist radiologists, clinicians, and medical specialists
                by identifying potential imaging abnormalities, assisting triage prioritization, and
                providing structured decision-support tooling.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs font-inter">
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5" data-aos="fade-up" data-aos-delay="100">
                  <Cpu className="w-5 h-5 text-teal-400" />
                  <span className="font-bold text-white block">Computer Vision Support</span>
                  <p className="text-slate-400">
                    Algorithms highlight potential regions of interest for specialist review.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5" data-aos="fade-up" data-aos-delay="200">
                  <Activity className="w-5 h-5 text-primary-400" />
                  <span className="font-bold text-white block">Triage Prioritization</span>
                  <p className="text-slate-400">
                    Facilitates prompt attention to critical studies needing immediate clinician evaluation.
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5" data-aos="fade-up" data-aos-delay="300">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white block">Secure Case Storage</span>
                  <p className="text-slate-400">
                    Protected DICOM/image handling with role-isolated healthcare access controls.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <ModuleAccessButton
                  module="imaging"
                  size="md"
                  label="Access ORBINOVA Imaging"
                />
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-800/70 border border-slate-700 p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 text-teal-400 font-poppins font-bold text-sm">
                <Stethoscope className="w-5 h-5" />
                <span>Clinical Oversight</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-inter">
                ORBINOVA Imaging operates strictly as an adjunct clinical decision-support tool. It
                empowers medical specialists with algorithmic insights while preserving ultimate
                clinical judgment with licensed human practitioners.
              </p>
            </div>
          </div>

          {/* Mandatory Clinical Safety Disclaimer */}
          <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/80 text-xs text-slate-300 font-inter leading-relaxed flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white mb-0.5">Clinical Safety & Regulatory Notice</p>
              ORBINOVA Imaging is a clinical decision-support tool designed to assist healthcare
              professionals. It does not replace qualified physicians, radiologists, or clinicians, and
              does not independently formulate medical diagnoses. All algorithmic findings require
              comprehensive review and clinical correlation by licensed medical practitioners.
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW THE PLATFORM WORKS */}
      <section id="how-it-works" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto" data-aos="fade-up">
          <Badge variant="primary" size="sm">
            Unified Workflow
          </Badge>
          <h2 className="font-poppins text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            How ORBINOVA Operates
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-inter">
            Coordinating complex healthcare logistics through clear, auditable operational steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3" data-aos="fade-up" data-aos-delay="100">
            <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center font-mono">
              01
            </span>
            <h3 className="font-poppins text-base font-bold text-slate-900">
              Institutional Entry
            </h3>
            <p className="text-xs text-slate-600 font-inter leading-relaxed">
              Verified healthcare organizations log into their respective module—submitting blood
              requests or uploading clinical imaging series.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3" data-aos="fade-up" data-aos-delay="200">
            <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center font-mono">
              02
            </span>
            <h3 className="font-poppins text-base font-bold text-slate-900">
              Intelligence Processing
            </h3>
            <p className="text-xs text-slate-600 font-inter leading-relaxed">
              Rules engines evaluate ABO compatibility and geographic distance for donors, while
              computer-vision models evaluate imaging anomalies.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3" data-aos="fade-up" data-aos-delay="300">
            <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center font-mono">
              03
            </span>
            <h3 className="font-poppins text-base font-bold text-slate-900">
              Clinician Review
            </h3>
            <p className="text-xs text-slate-600 font-inter leading-relaxed">
              Medical teams review transparent matching scores or prioritized imaging studies,
              ensuring full human-in-the-loop clinical governance.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3" data-aos="fade-up" data-aos-delay="400">
            <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center font-mono">
              04
            </span>
            <h3 className="font-poppins text-base font-bold text-slate-900">
              Fulfillment & Audit
            </h3>
            <p className="text-xs text-slate-600 font-inter leading-relaxed">
              Transactions are logged in tamper-evident audit trails—updating blood bank inventory
              levels and archiving clinical case records.
            </p>
          </div>
        </div>
      </section>

      {/* 7. ABOUT ORBINOVA */}
      <section id="about" className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-slate-100/70 rounded-3xl p-6 sm:p-12 lg:p-16 border border-slate-200/80 space-y-6" data-aos="fade-up">
          <div className="max-w-3xl space-y-4">
            <Badge variant="primary" size="sm">
              About ORBINOVA
            </Badge>
            <h2 className="font-poppins text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              Advancing Healthcare Intelligence
            </h2>
            <p className="text-sm sm:text-base text-slate-700 font-inter leading-relaxed">
              ORBINOVA is founded on the conviction that healthcare logistics and diagnostic support
              must be tightly integrated, highly accessible, and rigorously compliant with clinical
              standards. By maintaining a clear separation between parent-brand coordination and
              specialized operational modules, ORBINOVA ensures scalability, system resilience, and
              uncompromised medical governance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-xs font-inter">
            <div className="space-y-1">
              <span className="font-poppins font-bold text-slate-900 block text-sm">Parent Brand</span>
              <p className="text-slate-600">ORBINOVA coordinates overarching brand, navigation, and institutional access.</p>
            </div>
            <div className="space-y-1">
              <span className="font-poppins font-bold text-blood-700 block text-sm">ORBINOVA Donor</span>
              <p className="text-slate-600">Specialized donor-hospital coordination and real-time blood product matching.</p>
            </div>
            <div className="space-y-1">
              <span className="font-poppins font-bold text-teal-800 block text-sm">ORBINOVA Imaging</span>
              <p className="text-slate-600">AI-assisted medical imaging review and clinical decision support for radiologists.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CALL TO ACTION / INSTITUTIONAL ACCESS */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-slate-900 text-white rounded-3xl p-6 sm:p-12 lg:p-16 space-y-6 shadow-xl relative overflow-hidden" data-aos="zoom-in">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="font-poppins text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight">
              Ready to Access ORBINOVA Platforms?
            </h2>
            <p className="text-xs sm:text-sm text-primary-100 font-inter leading-relaxed">
              Connect your healthcare facility to our donor coordination network or launch our
              AI-assisted medical imaging solution.
            </p>
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <ModuleAccessButton
                module="donor"
                size="lg"
                label="Launch ORBINOVA Donor"
                className="w-full sm:w-auto"
              />
              <ModuleAccessButton
                module="imaging"
                size="lg"
                label="Launch ORBINOVA Imaging"
                className="w-full sm:w-auto"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
