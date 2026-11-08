"use client";

import React from "react";
import Image from "next/image";
import {
  Building2,
  Droplet,
  ScanLine,
  TestTubes,
  Monitor,
  Heart,
} from "lucide-react";

export const HeroVisual: React.FC = () => {
  return (
    <div className="relative w-full max-w-full sm:max-w-lg lg:max-w-none mx-auto select-none pt-4 pb-2">
      {/* Background Soft Organic Radial Glows */}
      <div className="absolute inset-0 bg-gradient-to-tr from-teal-400/25 via-cyan-300/30 to-primary-500/20 rounded-full blur-2xl -z-10" />

      {/* Main Curved Doctors Visual Container */}
      <div className="relative rounded-[2.5rem] p-2 bg-gradient-to-br from-teal-300/50 via-cyan-200/40 to-primary-300/40 shadow-2xl">
        <div className="relative rounded-[2.2rem] overflow-hidden bg-slate-100 shadow-inner aspect-[706/464] w-full">
          <Image
            src="/images/hero-consultation.png"
            alt="ORBINOVA Healthcare Specialists and Clinical Consultation"
            width={706}
            height={464}
            className="w-full h-full object-cover object-center"
            priority
          />

          {/* Ambient Lighting Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent pointer-events-none" />
        </div>

        {/* Floating Card 1: ORBINOVA Imaging (Top Right) */}
        <div className="hidden sm:flex absolute -top-4 sm:-top-5 right-0 sm:right-0 items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-teal-200/90 shadow-xl shadow-teal-500/10 z-20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200/80 flex items-center justify-center shrink-0 text-teal-700">
            <ScanLine className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <div className="font-poppins font-extrabold text-xs text-slate-900 leading-tight">
              ORBINOVA Imaging
            </div>
            <div className="text-[10px] font-inter text-slate-500 leading-tight mt-0.5">
              AI Medical Imaging & Diagnostic Support
            </div>
          </div>
        </div>

        {/* Floating Card 2: ORBINOVA Donor (Mid Left) */}
        <div className="hidden sm:flex absolute top-1/3 -left-2 sm:-left-3 items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-blood-200/90 shadow-xl shadow-blood-500/10 z-20 animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="w-10 h-10 rounded-xl bg-blood-50 border border-blood-200/80 flex items-center justify-center shrink-0 text-blood-600">
            <Droplet className="w-5 h-5 fill-blood-600 text-blood-600" />
          </div>
          <div>
            <div className="font-poppins font-extrabold text-xs text-slate-900 leading-tight">
              ORBINOVA Donor
            </div>
            <div className="text-[10px] font-inter text-slate-500 leading-tight mt-0.5">
              Donor Coordination & Blood Matching
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Capabilities Dock */}
      <div className="relative -mt-6 sm:-mt-8 mx-auto w-full max-w-md z-20 px-2 sm:px-0">
        <div className="rounded-2xl sm:rounded-3xl bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl shadow-slate-900/10 p-3 sm:p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-2 text-center sm:divide-x divide-slate-100">
          {/* Item 1: Hospitals */}
          <div className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-1 px-1.5">
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-poppins font-bold text-xs text-slate-900 leading-tight">
              Hospitals
            </span>
            <span className="text-[11px] sm:text-[10px] font-inter text-slate-500 leading-tight">
              Coordinate Care
            </span>
          </div>

          {/* Item 2: Donors */}
          <div className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-1 px-1.5">
            <div className="w-8 h-8 rounded-lg bg-blood-50 text-blood-600 flex items-center justify-center">
              <Heart className="w-4 h-4 fill-blood-600" />
            </div>
            <span className="font-poppins font-bold text-xs text-slate-900 leading-tight">
              Donors
            </span>
            <span className="text-[11px] sm:text-[10px] font-inter text-slate-500 leading-tight">
              Donate & Save Lives
            </span>
          </div>

          {/* Item 3: Blood Banks */}
          <div className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-1 px-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-blood-600 flex items-center justify-center">
              <TestTubes className="w-4 h-4" />
            </div>
            <span className="font-poppins font-bold text-xs text-slate-900 leading-tight">
              Blood Banks
            </span>
            <span className="text-[11px] sm:text-[10px] font-inter text-slate-500 leading-tight">
              Manage Inventory
            </span>
          </div>

          {/* Item 4: AI Imaging */}
          <div className="flex flex-col items-center justify-center space-y-1.5 sm:space-y-1 px-1.5">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Monitor className="w-4 h-4" />
            </div>
            <span className="font-poppins font-bold text-xs text-slate-900 leading-tight">
              AI Imaging
            </span>
            <span className="text-[11px] sm:text-[10px] font-inter text-slate-500 leading-tight">
              Clinical Support
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroVisual;
