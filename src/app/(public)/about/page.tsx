import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import {
  ShieldCheck,
  Droplet,
  ScanLine,
  Building2,
  Stethoscope,
  Cpu,
  Layers,
  Lock,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ModuleAccessButton } from "@/components/ui/ModuleAccessButton";
import { BRAND } from "@/constants/theme";

export const metadata: Metadata = {
  title: "About ORBINOVA | Integrated Healthcare Intelligence Platform",
  description:
    "Learn about ORBINOVA, our mission, and our two specialized healthcare solutions: ORBINOVA Donor and ORBINOVA Imaging.",
};

export default function AboutPage() {
  return (
    <div className="space-y-12 sm:space-y-24 py-8 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-inter">
      {/* 1. Header Banner */}
      <section className="text-center space-y-3 sm:space-y-4 max-w-3xl mx-auto" data-aos="fade-up">
        <Badge variant="primary" size="sm">
          About ORBINOVA
        </Badge>
        <h1 className="font-poppins text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Connecting Healthcare. Advancing Intelligence. Saving Lives.
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          ORBINOVA is an Integrated Healthcare Intelligence Platform designed to connect healthcare
          institutions, medical professionals, blood donation networks, and intelligent diagnostic
          technologies through an integrated healthcare ecosystem.
        </p>
      </section>

      {/* 2. Platform Architecture: Parent & Two Independent Modules */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
        <Card className="p-5 sm:p-8 bg-white border-slate-200/80 space-y-5 flex flex-col justify-between" data-aos="fade-right" data-aos-delay="100">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-blood-50 text-blood-600 flex items-center justify-center font-bold border border-blood-100">
              <Droplet className="w-6 h-6 fill-blood-600" />
            </div>
            <h2 className="font-poppins text-xl font-bold text-slate-900">
              ORBINOVA Donor
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              A healthcare donor coordination and blood-matching platform designed to connect
              verified healthcare institutions, eligible donors, blood banks, and patients requiring
              blood products. Built with deterministic 4-factor ABO/Rh clinical rules and
              transaction-safe inventory control.
            </p>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blood-600 shrink-0" />
                <span>Authorized institutional verification for blood donors</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blood-600 shrink-0" />
                <span>Zero override of mandatory clinical compatibility protocols</span>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <ModuleAccessButton module="donor" size="md" label="Access ORBINOVA Donor" className="w-full sm:w-auto" />
          </div>
        </Card>

        <Card className="p-5 sm:p-8 bg-white border-slate-200/80 space-y-5 flex flex-col justify-between" data-aos="fade-left" data-aos-delay="200">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold border border-teal-100">
              <ScanLine className="w-6 h-6" />
            </div>
            <h2 className="font-poppins text-xl font-bold text-slate-900">
              ORBINOVA Imaging
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              An AI-assisted medical imaging platform designed to support radiologists and healthcare
              professionals in reviewing medical images, identifying potential abnormalities, and
              prioritizing clinical review. Serves strictly as a clinical decision-support tool.
            </p>
            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                <span>AI anomaly prioritization assisting specialist review</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                <span>Preserves human-in-the-loop qualified medical governance</span>
              </div>
            </div>
          </div>
          <div className="pt-2">
            <ModuleAccessButton module="imaging" size="md" label="Access ORBINOVA Imaging" className="w-full sm:w-auto" />
          </div>
        </Card>
      </section>

      {/* 3. Core Architectural Values */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-12 lg:p-16 space-y-8" data-aos="fade-up">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-primary-400 font-poppins">
              Our Vision
            </span>
            <h3 className="text-2xl font-bold font-poppins">
              Resilient, Connected Healthcare Infrastructure
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              We envision healthcare environments where critical resource bottlenecks are
              eliminated through structured digital coordination, and diagnostic workloads are
              augmented through transparent, explainable intelligence.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400 font-poppins">
              Our Governance Standard
            </span>
            <h3 className="text-2xl font-bold font-poppins">
              Security, Privacy & Clinical Safety
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              ORBINOVA applications are engineered to maintain institutional verification, secure
              session integrity via HttpOnly cookies, and strict medical oversight. Algorithmic
              features assist clinicians without superseding certified medical expertise.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
