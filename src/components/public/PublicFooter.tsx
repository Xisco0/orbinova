import React from "react";
import Link from "next/link";
import { ShieldCheck, MapPin, ExternalLink, Droplet, ScanLine, Stethoscope } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { ModuleAccessButton } from "@/components/ui/ModuleAccessButton";
import { BRAND } from "@/constants/theme";

export const PublicFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 font-inter pt-10 sm:pt-16 pb-8 sm:pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 lg:gap-8 pb-8 sm:pb-12 border-b border-slate-800">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Logo variant="horizontal" size="md" href="/" inverted />
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
              ORBINOVA is an Integrated Healthcare Intelligence Platform connecting healthcare
              institutions, blood donor networks, and AI-assisted diagnostic imaging technologies.
            </p>
            <div className="pt-2 flex flex-col space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verified Healthcare Facility Infrastructure</span>
              </div>
              <div className="flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-primary-400 shrink-0" />
                <span>Clinical Decision Support Architecture</span>
              </div>
            </div>
          </div>

          {/* Column 2: Solutions */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-poppins">
              Solutions
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link href="/#solutions" className="hover:text-white transition-colors">
                  ORBINOVA Donor
                </Link>
              </li>
              <li>
                <Link href="/#solutions" className="hover:text-white transition-colors">
                  ORBINOVA Imaging
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-white transition-colors">
                  How the Platform Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Platform Architecture
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources & Compliance */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-poppins">
              Information
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  About ORBINOVA
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Institutional Inquiries
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: External Module Access Gateways */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-poppins">
              Module Access
            </h3>
            <p className="text-[11px] text-slate-400">
              Access independently deployed specialized applications:
            </p>
            <div className="space-y-2 pt-1">
              <ModuleAccessButton
                module="donor"
                size="sm"
                label="Launch Donor"
                fullWidth
              />
              <ModuleAccessButton
                module="imaging"
                size="sm"
                label="Launch Imaging"
                fullWidth
              />
            </div>
          </div>
        </div>

        {/* Bottom Clinical Notice & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="text-center md:text-left">
            &copy; {currentYear} {BRAND.name}. All rights reserved. {BRAND.tagline}
          </p>
          <div className="text-[11px] text-slate-500 text-center md:text-right max-w-md">
            ORBINOVA applications provide clinical decision support and logistical coordination.
            Clinical judgment and patient diagnoses remain with licensed medical professionals.
          </div>
        </div>
      </div>
    </footer>
  );
};
