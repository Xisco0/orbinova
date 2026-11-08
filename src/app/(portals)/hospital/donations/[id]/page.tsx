import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Heart, Calendar, ShieldCheck, User } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { PageHeader, Card, Badge } from "@/components/ui";

interface PageProps {
  params: { id: string };
}

export default async function HospitalDonationDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  const donation = await hospitalService.getDonationById(
    context.organization.id,
    params.id
  );

  if (!donation) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/hospital/donations"
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Donations Ledger</span>
      </Link>

      <Card className="p-6 sm:p-8 space-y-6 bg-white border-slate-200 shadow-sm">
        <div className="border-b border-slate-100 pb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Heart className="w-6 h-6 fill-emerald-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block font-inter">
                Certified Transfusion Record
              </span>
              <h2 className="font-poppins font-bold text-xl text-dark">
                Donation DON-{donation.id.substring(0, 8).toUpperCase()}
              </h2>
            </div>
          </div>

          <Badge variant="success" size="md">
            {donation.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-100 text-xs sm:text-sm font-inter">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Donor Identifier
            </span>
            <span className="font-mono font-bold text-dark">{donation.donor_ref}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Donation Date
            </span>
            <span className="text-dark">
              {new Date(donation.donation_date).toLocaleDateString("en-NG", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Blood Group
            </span>
            <span className="font-bold text-blood-600 text-base font-poppins">
              {donation.blood_group}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Units Collected
            </span>
            <span className="font-bold text-dark text-base font-poppins">
              {donation.units_donated} Unit{donation.units_donated > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate-600 font-inter">
          <div className="flex items-center gap-2 text-dark font-medium">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Recorded by: <strong>{donation.recorder_name}</strong></span>
          </div>

          {donation.notes && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <span className="block mb-1">Clinical Screening Notes:</span>
              <span>{donation.notes}</span>
            </div>
          )}
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-secondary-600" />
            <span>Audited & verified in hospital stock ledger</span>
          </div>
          <span className="text-[11px] text-slate-500">
            {context.organization.name}
          </span>
        </div>
      </Card>
    </div>
  );
}
