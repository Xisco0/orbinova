import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Heart, Calendar, Building2, CheckCircle2, ShieldCheck, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import { PageHeader, Card, Badge } from "@/components/ui";

interface PageProps {
  params: { id: string };
}

export default async function DonorDonationDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/donor/login");

  const donorContext = await donorService.getDonorContext(user.id);
  if (!donorContext) redirect("/donor");

  const donation = await donorService.getDonorDonationById(
    donorContext.donorProfile.id,
    params.id
  );

  if (!donation) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/donor/donations"
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Donation History</span>
      </Link>

      {/* Verified Certificate / Record Card */}
      <Card className="p-6 sm:p-8 space-y-6 bg-white border-slate-200 shadow-sm relative overflow-hidden">
        {/* Certificate Watermark Header */}
        <div className="border-b border-slate-100 pb-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blood-50 border border-blood-100 text-blood-600 flex items-center justify-center shrink-0">
              <Heart className="w-6 h-6 fill-blood-600" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blood-600 uppercase tracking-wider block">
                Official Transfusion Record
              </span>
              <h2 className="font-poppins font-bold text-xl text-dark">
                Verified Donation Certificate
              </h2>
            </div>
          </div>

          <Badge variant="success" size="md">
            {donation.status}
          </Badge>
        </div>

        {/* Certificate Details */}
        <div className="grid grid-cols-2 gap-4 py-2 border-b border-slate-100 text-xs sm:text-sm font-inter">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Donation Reference
            </span>
            <span className="font-mono font-bold text-dark">
              DON-{donation.id.substring(0, 8).toUpperCase()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px] uppercase">
              Date Contributed
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
              Units Donated
            </span>
            <span className="font-bold text-dark text-base font-poppins">
              {donation.units_donated} Unit{donation.units_donated > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Facility Info */}
        <div className="space-y-2 text-xs text-slate-600 font-inter">
          <div className="flex items-center gap-2 text-dark">
            <Building2 className="w-4 h-4 text-secondary-600" />
            <span>{donation.organization?.name || "Accredited Health Center"}</span>
          </div>
          <div className="flex items-center gap-2 pl-6 text-slate-500">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {donation.organization?.city}, {donation.organization?.state}, Nigeria
            </span>
          </div>

          {donation.notes && (
            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
              <span className="block mb-1">Clinical Note:</span>
              <span>{donation.notes}</span>
            </div>
          )}
        </div>

        {/* Verification Stamp Footer */}
        <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-between text-xs text-teal-900">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span className="">Recorded on SmartDonor Health Ledger</span>
          </div>
          <span className="text-[11px] text-teal-700">Verified</span>
        </div>
      </Card>
    </div>
  );
}
