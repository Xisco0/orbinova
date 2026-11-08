import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Droplet, Clock, ShieldCheck, Heart, HeartHandshake, AlertTriangle, ArrowRight, Calendar, MapPin, CheckCircle2, Activity } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import {
  DonorStatCard,
  DonorRequestCard,
  ProfileCompletionBar,
  DonorScreeningAppointments,
} from "@/components/donor";
import { screeningStore } from "@/services/screeningStore";
import { Button, PageHeader } from "@/components/ui";

export const revalidate = 0;

export default async function DonorDashboardPage() {
  let user = await getCurrentUser("donor");
  if (!user) user = await getCurrentUser();
  if (!user) redirect("/donor/login");

  const donorContext = await donorService.getDonorContext(user.id);
  if (!donorContext) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <h2 className="text-lg font-bold text-dark">Initializing Donor Profile...</h2>
        <p className="text-sm text-slate-500 mt-2">Please refresh in a moment.</p>
      </div>
    );
  }

  const { donorProfile } = donorContext;
  const metrics = await donorService.getDashboardMetrics(donorProfile.id, user.id);
  const completion = donorService.calculateProfileCompletion(user.profile!, donorProfile);

  const isAvailable = donorProfile.availability_status === "available";
  const isEligible = donorProfile.eligibility_status === "eligible";
  const donorScreenings = screeningStore.getByDonor(donorProfile.id);

  return (
    <div className="space-y-6">
      {/* Top Banner: Welcome & Emergency matching alert */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-poppins font-bold text-xl sm:text-2xl md:text-3xl text-dark tracking-tight break-words">
            Welcome back, {user.profile?.full_name?.split(" ")[0] || "Hero"}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-inter mt-1 truncate">
            Your readiness to donate saves lives across hospitals in Nigeria.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3 w-full md:w-auto">
          <Link href="/donor/availability" className="w-full sm:w-auto">
            <Button
              variant={isAvailable ? "outline" : "blood"}
              size="sm"
              className="text-xs w-full sm:w-auto justify-center whitespace-nowrap py-2 sm:py-1.5"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="truncate">{isAvailable ? "Availability" : "Be Available"}</span>
            </Button>
          </Link>
          <Link href="/donor/requests" className="w-full sm:w-auto">
            <Button
              variant="blood"
              size="sm"
              className="text-xs w-full sm:w-auto justify-center whitespace-nowrap py-2 sm:py-1.5"
            >
              <HeartHandshake className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="truncate">Requests ({metrics.pendingRequestsCount})</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Emergency Pending Match Alert (if any pending requests) */}
      {metrics.pendingRequestsCount > 0 && (
        <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-blood-600 via-rose-600 to-red-600 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 animate-pulse">
          <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="font-poppins font-bold text-sm sm:text-base leading-tight truncate">
                Urgent Blood Match Requires Your Response!
              </h3>
              <p className="text-[11px] sm:text-xs text-rose-100 font-inter line-clamp-2 mt-0.5">
                You have {metrics.pendingRequestsCount} active compatible blood request waiting for review.
              </p>
            </div>
          </div>

          <Link href="/donor/requests" className="w-full sm:w-auto">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-blood-600 hover:bg-rose-50 font-bold border-none shrink-0 w-full sm:w-auto justify-center whitespace-nowrap"
            >
              Review Request Now →
            </Button>
          </Link>
        </div>
      )}

      {/* Profile Completion Indicator */}
      <ProfileCompletionBar
        percentage={completion.percentage}
        missingFields={completion.missingFields}
      />

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <DonorStatCard
          label="Blood Type"
          value={donorProfile.blood_group}
          subtitle="Registered Group"
          icon={Droplet}
          variant="blood"
          href="/donor/profile"
          actionText="Edit"
        />

        <DonorStatCard
          label="Readiness"
          value={isAvailable ? "Available" : "Paused"}
          subtitle={isAvailable ? "Ready to respond" : "Unavailable"}
          icon={Clock}
          variant={isAvailable ? "success" : "warning"}
          href="/donor/availability"
          actionText="Update"
        />

        <DonorStatCard
          label="Eligibility"
          value={isEligible ? "Eligible" : "Resting"}
          subtitle={isEligible ? "Interval clear" : "90-day recovery"}
          icon={ShieldCheck}
          variant={isEligible ? "success" : "primary"}
          href="/donor/eligibility"
          actionText="Details"
        />

        <DonorStatCard
          label="Donations"
          value={metrics.totalDonations}
          subtitle="Units contributed"
          icon={Heart}
          variant="secondary"
          href="/donor/donations"
          actionText="History"
        />

        <div className="col-span-2 sm:col-span-1">
          <DonorStatCard
            label="Matches"
            value={metrics.pendingRequestsCount}
            subtitle="Pending responses"
            icon={HeartHandshake}
            variant={metrics.pendingRequestsCount > 0 ? "blood" : "default"}
            href="/donor/requests"
            actionText="View"
          />
        </div>
      </div>

      {/* Pre-Donation Screening Arrangements Section */}
      <DonorScreeningAppointments screenings={donorScreenings} />

      {/* Main Grid: Recent Requests & Latest Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Requests */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-poppins font-bold text-lg text-dark flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-blood-600" />
              <span>Matched Blood Requests</span>
            </h3>
            <Link
              href="/donor/requests"
              className="text-xs text-blood-600 hover:text-blood-700 hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {metrics.recentRequests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-poppins font-semibold text-dark text-sm">
                  No Pending Requests Right Now
                </h4>
                <p className="text-xs text-slate-500 font-inter mt-1 max-w-sm mx-auto">
                  When a hospital or blood bank in your region broadcasts an emergency request matching your {donorProfile.blood_group} blood type, it will appear here immediately.
                </p>
              </div>
              <Link href="/donor/availability">
                <Button variant="outline" size="sm" className="mt-2 text-xs">
                  Confirm Availability
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.recentRequests.map((req) => (
                <DonorRequestCard key={req.id} request={req} />
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Latest Donation & Quick Actions */}
        <div className="space-y-6">
          {/* Latest Donation Card */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4 shadow-xs">
            <h4 className="font-poppins font-bold text-sm text-dark flex items-center gap-2">
              <Heart className="w-4 h-4 text-blood-600" />
              <span>Your Life-Saving Impact</span>
            </h4>

            {metrics.latestDonation ? (
              <div className="space-y-3 text-xs font-inter">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Facility:</span>
                    <span className="font-bold text-dark truncate max-w-[150px]">
                      {metrics.latestDonation.organization?.name || "Medical Center"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Date:</span>
                    <span className="text-dark">
                      {new Date(metrics.latestDonation.donation_date).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Units Contributed:</span>
                    <span className="font-bold text-blood-600">
                      {metrics.latestDonation.units_donated} Unit ({metrics.latestDonation.blood_group})
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 text-teal-900 text-xs">
                  <p className="">Estimated Impact:</p>
                  <p className="text-[11px] text-teal-800 mt-0.5">
                    Your {metrics.totalDonations} donation{metrics.totalDonations !== 1 ? "s have" : " has"} helped up to {metrics.totalDonations * 3} patients in need!
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center bg-slate-50 rounded-xl space-y-2">
                <p className="text-xs text-slate-500 font-inter">
                  You haven't recorded your first donation yet.
                </p>
                <p className="text-[11px] text-slate-400">
                  When you donate at an authorized center, your certified record will appear here.
                </p>
              </div>
            )}

            <Link href="/donor/donations" className="block">
              <Button variant="outline" size="sm" fullWidth className="text-xs">
                View Full Donation Ledger
              </Button>
            </Link>
          </div>

          {/* Quick Helpful Guide */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <h4 className="font-poppins font-bold text-xs uppercase tracking-wider text-amber-400">
                Donor Preparation Tip
              </h4>
            </div>
            <p className="text-xs text-slate-300 font-inter leading-relaxed">
              Drink at least 500ml of water and have a healthy meal before responding to or arriving for your blood donation appointment.
            </p>
            <Link
              href="/donor/eligibility"
              className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline inline-block pt-1"
            >
              Read Full Donation Guidelines →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
