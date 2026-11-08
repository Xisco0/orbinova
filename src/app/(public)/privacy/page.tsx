import React from "react";
import { Metadata } from "next";
import { ShieldCheck, Lock, EyeOff, Server, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { BRAND } from "@/constants/theme";

export const metadata: Metadata = {
  title: "Privacy Policy | ORBINOVA Data Protection & Security",
  description:
    "Learn how ORBINOVA collects, protects, and handles personal, institutional, and healthcare information under strict security standards.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-10 sm:space-y-12 py-8 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-inter text-slate-800">
      {/* 1. Header */}
      <section className="space-y-3">
        <Badge variant="primary" size="sm">
          Privacy Policy
        </Badge>
        <h1 className="font-poppins text-2xl xs:text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          ORBINOVA Privacy Policy
        </h1>
        <p className="text-xs text-slate-500">
          Effective Date: November 2026 &bull; Version 2.0
        </p>
      </section>

      {/* 2. Privacy Commitment Banner */}
      <Card className="p-5 sm:p-6 bg-emerald-50/70 border-emerald-200 space-y-2">
        <div className="flex items-center gap-2 font-poppins font-bold text-emerald-900 text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          <span>Our Privacy Commitment</span>
        </div>
        <p className="text-xs sm:text-sm text-emerald-950 leading-relaxed">
          ORBINOVA is engineered to limit unnecessary exposure of sensitive medical data. We do not
          operate public patient or donor directories, sell medical information, or monetize
          confidential health records.
        </p>
      </Card>

      {/* 3. Sections */}
      <div className="space-y-8 text-xs sm:text-sm text-slate-700 leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            1. Information We Collect
          </h2>
          <p>
            When you interact with SmartDonor, we collect only the information necessary to provide reliable blood matching and coordination services:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>
              <strong>Account Credentials:</strong> Email address, encrypted password, and account role (donor, hospital, blood bank, administrator).
            </li>
            <li>
              <strong>Voluntary Donor Profile:</strong> Full name, telephone number, confirmed ABO/Rh blood group, optional genotype, city, state, and self-managed availability status.
            </li>
            <li>
              <strong>Organization Information:</strong> Healthcare facility name, official email, telephone, facility address, city, state, and approximate operational latitude/longitude for geodesic distance calculations.
            </li>
            <li>
              <strong>Clinical Request Data:</strong> Blood group requirements, unit counts, clinical urgency, request status, and donation fulfillment records.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            2. How We Use Collected Information
          </h2>
          <p>
            Your information is used strictly for legitimate healthcare coordination operations:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>
              <strong>Smart Matching:</strong> Calculating red-cell blood compatibility, proximity radius, and availability to match suitable voluntary donors with active hospital requests.
            </li>
            <li>
              <strong>Notification Dispatch:</strong> Sending urgent in-app or SMS/email notifications when nearby medical facilities require your compatible blood group.
            </li>
            <li>
              <strong>Fulfillment & Verification:</strong> Allowing hospital staff to confirm donor attendance and update blood stock inventory upon successful collection.
            </li>
            <li>
              <strong>Audit Logging:</strong> Maintaining secure, tamper-evident audit trails for clinical transparency and administrative oversight.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            3. Non-Public Visibility & Disclosure Restrictions
          </h2>
          <p>
            SmartDonor enforces rigorous confidentiality controls:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>
              <strong>No Searchable Public Listings:</strong> Your donor profile, phone number, and physical coordinates are never indexed by web crawlers or exposed in public search results.
            </li>
            <li>
              <strong>Restricted Hospital Access:</strong> Hospital personnel only receive access to a donor&apos;s contact details after that specific donor has actively accepted a matching request.
            </li>
            <li>
              <strong>No Third-Party Commercial Sharing:</strong> We do not sell, rent, or monetize personal or clinical data.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            4. Security Architecture
          </h2>
          <p>
            We implement industry-standard security safeguards to protect stored data:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>
              <strong>PostgreSQL Row Level Security (RLS):</strong> Database-level policies ensure that users and organizations can strictly view and modify only records they are authorized to access.
            </li>
            <li>
              <strong>Transport Encryption:</strong> All communications between client devices and our application servers are encrypted via modern TLS protocols.
            </li>
            <li>
              <strong>Credential Protection:</strong> Passwords are never stored in plaintext and privileged service-role credentials remain isolated strictly to secure backend environments.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            5. User Rights & Account Management
          </h2>
          <p>
            You maintain full ownership and control of your information:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-slate-600">
            <li>
              <strong>Profile Updates:</strong> You can edit your phone number, city, availability, and notification preferences at any time.
            </li>
            <li>
              <strong>Account Deactivation:</strong> You can deactivate your account from your portal settings, immediately removing yourself from all active matching candidate pools.
            </li>
            <li>
              <strong>Data Inquiries:</strong> You may request clarification or data export by contacting our privacy team.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-poppins font-bold text-base sm:text-lg text-slate-900">
            6. Contacting the Privacy Team
          </h2>
          <p>
            If you have questions regarding this Privacy Policy or our security practices, please contact our data protection team at{" "}
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
