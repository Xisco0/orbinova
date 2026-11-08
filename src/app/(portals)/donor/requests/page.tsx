import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HeartHandshake, Filter, CheckCircle2, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { donorService } from "@/services/donorService";
import { DonorRequestCard } from "@/components/donor";
import { PageHeader, EmptyState } from "@/components/ui";

interface PageProps {
  searchParams: { status?: string; search?: string };
}

export const revalidate = 0;

export default async function DonorRequestsPage({ searchParams }: PageProps) {
  let user = await getCurrentUser("donor");
  if (!user) user = await getCurrentUser();
  if (!user) redirect("/donor/login");

  const donorContext = await donorService.getDonorContext(user.id);
  if (!donorContext) redirect("/donor");

  const filterStatus = searchParams.status || "all";
  const requests = await donorService.getDonorRequests(
    donorContext.donorProfile.id,
    filterStatus,
    user.id
  );

  const tabs = [
    { key: "all", label: "All Requests" },
    { key: "active", label: "Active & Pending" },
    { key: "accepted", label: "Accepted" },
    { key: "completed", label: "Completed" },
    { key: "history", label: "History (Declined/Expired)" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blood Donation Requests"
        description="Review and respond to matched requests from accredited medical facilities."
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {tabs.map((tab) => {
          const isActive = filterStatus === tab.key;
          return (
            <Link
              key={tab.key}
              href={`/donor/requests${tab.key === "all" ? "" : `?status=${tab.key}`}`}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm transition-all ${
                isActive
                  ? "bg-blood-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-dark hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Request Cards List */}
      {requests.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="w-7 h-7 text-blood-600" />}
          title="No Requests Found"
          description={
            filterStatus === "all"
              ? "You do not have any blood donation requests at this time. When a compatible match occurs, it will appear here."
              : `No donation requests matching the filter "${filterStatus}".`
          }
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <DonorRequestCard key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}
