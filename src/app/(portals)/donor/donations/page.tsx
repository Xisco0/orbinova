import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Heart, Calendar, Building2, CheckCircle2, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import { PageHeader, EmptyState, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";

export default async function DonorDonationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/donor/login");

  const donorContext = await donorService.getDonorContext(user.id);
  if (!donorContext) redirect("/donor");

  const donations = await donorService.getDonorDonations(
    donorContext.donorProfile.id
  );

  const totalUnits = donations
    .filter((d) => d.status === "completed")
    .reduce((acc, curr) => acc + curr.units_donated, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Donation History & Verified Records"
        description="Your certified blood donation history recorded across participating Nigerian facilities."
      />

      {/* Impact Banner */}
      <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-teal-600 via-teal-700 to-slate-800 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-rose-300 fill-rose-300" />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-teal-200">
              Personal Impact Milestone
            </span>
          </div>
          <h3 className="font-poppins font-bold text-xl sm:text-2xl">
            {totalUnits} {totalUnits === 1 ? "Unit Donated" : "Units Donated"}
          </h3>
          <p className="text-xs text-teal-100 font-inter">
            Your generous contributions have potentially saved up to {totalUnits * 3} lives.
          </p>
        </div>

        <Link
          href="/donor/eligibility"
          className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold transition-all self-start sm:self-auto"
        >
          Check Next Eligible Date →
        </Link>
      </div>

      {/* Donations List / Table */}
      {donations.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-7 h-7 text-blood-600" />}
          title="No Donations Recorded Yet"
          description="Your donation history will appear here once an accredited hospital or blood bank records your verified contribution."
        />
      ) : (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference / ID</TableHead>
                <TableHead>Donation Date</TableHead>
                <TableHead>Healthcare Facility</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs text-slate-700">
                    DON-{d.id.substring(0, 8).toUpperCase()}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-dark">
                    {new Date(d.donation_date).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    <span className="text-dark block">
                      {d.organization?.name || "Medical Facility"}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {d.organization?.city}, {d.organization?.state}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="px-2 py-0.5 rounded-md bg-blood-50 border border-blood-200 text-blood-700 font-bold text-xs">
                      {d.blood_group}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-bold text-dark">
                    {d.units_donated} Unit{d.units_donated > 1 ? "s" : ""}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        d.status === "completed"
                          ? "success"
                          : d.status === "scheduled"
                          ? "primary"
                          : "secondary"
                      }
                      size="sm"
                    >
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/donor/donations/${d.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blood-600 hover:underline"
                    >
                      <span>Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
