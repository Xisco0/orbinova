import React from "react";
import { Metadata } from "next";
import { FileText, AlertTriangle, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { BRAND } from "@/constants/theme";

export const metadata: Metadata = {
  title: "Terms of Service | ORBINOVA Platform Agreement",
  description:
    "Review the terms, conditions, user responsibilities, and clinical disclaimers governing the use of the ORBINOVA platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="space-y-10 sm:space-y-12 py-8 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-inter text-slate-800">
      {/* 1. Header */}
      <section className="space-y-3">
        <Badge variant="primary" size="sm">
          Terms of Service
        </Badge>
        <h1 className="font-poppins text-2xl xs:text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          ORBINOVA Terms of Service
        </h1>
        <p className="text-xs text-slate-500">
          Last Updated: November 2026 &bull; Version 2.0
        </p>
      </section>

      {/* 2. Medical & Clinical Disclaimer Banner */}
      <Card className="p-5 sm:p-6 bg-amber-50/70 border-amber-200 space-y-2">
        <div className="flex items-center gap-2 font-poppins font-bold text-amber-900 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-700" />
          <span>Important Clinical & Medical Disclaimer</span>
        </div>
        <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
          ORBINOVA is an information technology and clinical decision-support platform. ORBINOVA is not
          a healthcare facility, medical laboratory, or blood bank. ORBINOVA does not provide medical
          diagnoses, clinical cross-matching, or blood processing. All medical determinations, donor
          screenings, diagnostic imaging reviews, and transfusion procedures must be conducted by
          certified healthcare professionals.
        </p>
      </Card>

      {/* 3. Detailed Terms Sections */}
      <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using the SmartDonor application (including the public website, donor portal, hospital portal, and admin interfaces), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, you must discontinue use immediately.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            2. Account Registration & Responsibilities
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>
              <strong>Accurate Information:</strong> You agree to provide true, accurate, and current information regarding your identity, contact details, and blood group.
            </li>
            <li>
              <strong>Account Security:</strong> You are responsible for safeguarding your login credentials and for all activities occurring under your account.
            </li>
            <li>
              <strong>Voluntary Participation:</strong> Voluntary blood donors register and participate freely. Donors are under no legal obligation to accept any matching request dispatched by the platform.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            3. Healthcare Facility & Organization Obligations
          </h2>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>
              <strong>Authorized Representatives:</strong> Only verified healthcare facilities and certified blood transfusion services may create blood requests on SmartDonor.
            </li>
            <li>
              <strong>Genuine Clinical Needs:</strong> Blood requests submitted through the portal must represent genuine clinical demand for patient care or certified inventory replenishment.
            </li>
            <li>
              <strong>Mandatory Pre-Transfusion Screening:</strong> Healthcare facilities are strictly responsible for conducting standard hemoglobin, viral, and cross-match screening on any donor prior to blood collection.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            4. Prohibited Uses & Acceptable Use Policy
          </h2>
          <p>
            Users of SmartDonor agree not to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>Submit fraudulent, fictitious, or speculative blood requests.</li>
            <li>Use the platform for commercial blood trading, unauthorized solicitation, or paid blood brokerages.</li>
            <li>Attempt to reverse-engineer, probe, or bypass application security, authentication, or Row Level Security policies.</li>
            <li>Scrape, harvest, or extract user records from the platform.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            5. Intellectual Property & System Availability
          </h2>
          <p>
            All logos, trademarks, matching algorithms, source code, UI components, and platform documentation are the intellectual property of SmartDonor and its licensors. While we strive for high service reliability, SmartDonor does not warrant uninterrupted or error-free continuous operation.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            6. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, SmartDonor and its operators shall not be liable for any direct, indirect, incidental, or consequential damages resulting from delays in donor responses, clinical blood screening outcomes, or technical disruptions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            7. Legal Review Notice & Contact
          </h2>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 block mb-0.5">[Notice: Formal Legal Review]</span>
            These terms represent standard platform operational guidelines and are subject to ongoing legal review and formal health regulatory alignment in Nigeria.
          </div>
          <p className="pt-2">
            For inquiries regarding these Terms of Service, please reach out to{" "}
            <a href={`mailto:${BRAND.supportEmail}`} className="text-primary-600 font-semibold hover:underline">
              {BRAND.supportEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
