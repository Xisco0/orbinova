import React from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { adminService } from "@/services/adminService";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  EmptyState,
} from "@/components/ui";
import {
  BloodGroupBadge,
  UrgencyBadge,
  RequestStatusBadge,
  InventoryStatusBadge,
} from "@/components/admin";
import { Building2, Users, Droplet, AlertCircle, ShieldAlert, ArrowRight, Package, Activity, Heart, CheckCircle2, TrendingUp, Clock, ChevronRight, ArrowUpRight, Shield, Radio } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const revalidate = 0; // Fresh real-time data

export default async function AdminDashboardPage() {
  const [user, metrics] = await Promise.all([
    getCurrentUser(),
    adminService.getDashboardMetrics(),
  ]);

  const firstName = user?.profile?.full_name?.trim().split(" ")[0] || "Operator";

  // Formatted current date and time
  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(now);

  const bloodGroupsList = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const maxDemand = Math.max(
    1,
    ...bloodGroupsList.map((bg) => metrics.analytics?.demandByGroup?.[bg] || 0)
  );

  const maxWeekly = Math.max(
    1,
    ...(metrics.analytics?.weeklyTrend || []).map((d) => Math.max(d.requests, d.donations))
  );

  return (
    <div className="space-y-4 sm:space-y-7">
      {/* 1. Header & Welcome Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-dark font-poppins tracking-tight">
            Welcome back, {firstName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-inter mt-0.5 sm:mt-1">
            Here&apos;s what&apos;s happening with the SmartDonor platform today.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 text-[11px] sm:text-xs font-inter text-slate-600">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[130px] xs:max-w-none">{formattedDate}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] font-medium text-emerald-700 shrink-0">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live Network</span>
          </div>
        </div>
      </div>

      {/* 2. Primary 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        {/* Total Organizations */}
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 font-inter">
              Organizations
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xl sm:text-3xl font-bold text-dark font-poppins leading-none">
              {metrics.organizations.total}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
              <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                +12%
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-inter truncate hidden xs:inline">
                vs. 30d
              </span>
            </div>
          </div>
        </div>

        {/* Total Users */}
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 font-inter">
              Total Users
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xl sm:text-3xl font-bold text-dark font-poppins leading-none">
              {metrics.users.total}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
              <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                +8%
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-inter truncate hidden xs:inline">
                {metrics.users.donors} donors
              </span>
            </div>
          </div>
        </div>

        {/* Open Blood Requests */}
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 font-inter">
              Open Requests
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Droplet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xl sm:text-3xl font-bold text-dark font-poppins leading-none">
              {metrics.bloodOperations.openRequests}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
              <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-medium text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md truncate max-w-[110px]">
                {metrics.bloodOperations.emergencyRequests > 0 ? (
                  <>
                    <AlertCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                    {metrics.bloodOperations.emergencyRequests} Emergency
                  </>
                ) : (
                  <>+35% vs. 7d</>
                )}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-inter truncate hidden xs:inline">
                active
              </span>
            </div>
          </div>
        </div>

        {/* Available Blood Units */}
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500 font-inter">
              Available Units
            </span>
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <span className="text-xl sm:text-3xl font-bold text-dark font-poppins leading-none">
              {metrics.inventory.totalAvailableUnits}
            </span>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
              <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                +6%
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-inter truncate hidden xs:inline">
                in stock
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Grid: Operations Analytics & Important Alerts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Analytics Charts & Trends */}
        <div className="lg:col-span-2 space-y-6">
          {/* Blood Requests & Donation Volume Trend Chart */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h3 className="font-bold text-dark text-base font-poppins">
                  Blood Requests & Donation Activity
                </h3>
                <p className="text-xs text-slate-500 font-inter">
                  7-day comparative trend of hospital demand vs fulfilled units
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-inter">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                  <span className="text-slate-600">Requests</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-600">Donations</span>
                </div>
              </div>
            </div>

            {/* Visual Bar / Curve Chart */}
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 pt-4 pb-2 border-b border-slate-100">
                {(metrics.analytics?.weeklyTrend || []).map((day, idx) => {
                  const reqHeight = Math.max(8, Math.round((day.requests / maxWeekly) * 100));
                  const donHeight = Math.max(8, Math.round((day.donations / maxWeekly) * 100));

                  return (
                    <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center h-full">
                        {/* Request Bar */}
                        <div
                          style={{ height: `${reqHeight}%` }}
                          className="w-2.5 sm:w-4 bg-blue-500 hover:bg-blue-600 rounded-t-sm transition-all duration-300 relative group/bar cursor-pointer"
                        >
                          <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none transition-opacity font-mono z-10 whitespace-nowrap">
                            {day.requests} reqs
                          </div>
                        </div>

                        {/* Donation Bar */}
                        <div
                          style={{ height: `${donHeight}%` }}
                          className="w-2.5 sm:w-4 bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all duration-300 relative group/bar cursor-pointer"
                        >
                          <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none transition-opacity font-mono z-10 whitespace-nowrap">
                            {day.donations} units
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-400 font-inter truncate">
                        {day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Blood Group Demand & Status Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Blood Group Demand Distribution */}
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="font-bold text-dark text-sm font-poppins">
                  Blood Group Demand
                </h3>
                <p className="text-xs text-slate-500 font-inter">
                  Aggregated hospital requests by blood group
                </p>
              </div>

              <div className="space-y-2.5">
                {bloodGroupsList.map((bg) => {
                  const count = metrics.analytics?.demandByGroup?.[bg] || 0;
                  const pct = Math.round((count / maxDemand) * 100);

                  return (
                    <div key={bg} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-inter">
                        <span className="font-bold text-dark">{bg}</span>
                        <span className="text-slate-500 text-[11px]">{count} units required</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(4, pct)}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            bg.includes("-") ? "bg-rose-500" : "bg-blue-500"
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Request Status Breakdown */}
            <Card className="p-5">
              <div className="mb-4">
                <h3 className="font-bold text-dark text-sm font-poppins">
                  Request Status Distribution
                </h3>
                <p className="text-xs text-slate-500 font-inter">
                  Lifecycle state of recorded blood requests
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    label: "Open / Broadcasting",
                    count: metrics.analytics?.statusCounts?.open || 0,
                    color: "bg-blue-500",
                    textColor: "text-blue-700",
                    bgBadge: "bg-blue-50 border-blue-200",
                  },
                  {
                    label: "Matching in Progress",
                    count: metrics.analytics?.statusCounts?.matching || 0,
                    color: "bg-amber-500",
                    textColor: "text-amber-700",
                    bgBadge: "bg-amber-50 border-amber-200",
                  },
                  {
                    label: "Partially Fulfilled",
                    count: metrics.analytics?.statusCounts?.partially_fulfilled || 0,
                    color: "bg-indigo-500",
                    textColor: "text-indigo-700",
                    bgBadge: "bg-indigo-50 border-indigo-200",
                  },
                  {
                    label: "Fulfilled / Closed",
                    count: metrics.analytics?.statusCounts?.fulfilled || 0,
                    color: "bg-emerald-500",
                    textColor: "text-emerald-700",
                    bgBadge: "bg-emerald-50 border-emerald-200",
                  },
                  {
                    label: "Cancelled / Expired",
                    count:
                      (metrics.analytics?.statusCounts?.cancelled || 0) +
                      (metrics.analytics?.statusCounts?.expired || 0),
                    color: "bg-slate-400",
                    textColor: "text-slate-600",
                    bgBadge: "bg-slate-50 border-slate-200",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs font-inter">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                      <span className="text-dark">{item.label}</span>
                    </div>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-md border ${item.bgBadge} ${item.textColor}`}
                    >
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Right Column (1 Col): Important Alert Panel & Recent Activity */}
        <div className="space-y-6">
          {/* Important Alert Panel */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-dark text-sm font-poppins">
                  Important Operational Alerts
                </h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                {(metrics.alerts || []).length} Active
              </span>
            </div>

            <div className="space-y-3">
              {(metrics.alerts || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-inter bg-slate-50 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                  All operational metrics within normal thresholds.
                </div>
              ) : (
                (metrics.alerts || []).map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all hover:shadow-xs group ${
                      alert.urgencyLevel === "critical"
                        ? "bg-rose-50/70 border-rose-200 hover:border-rose-300"
                        : "bg-amber-50/70 border-amber-200 hover:border-amber-300"
                    }`}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            alert.urgencyLevel === "critical"
                              ? "bg-rose-600 animate-ping"
                              : "bg-amber-500"
                          }`}
                        />
                        <h4 className="text-xs font-bold text-dark font-poppins truncate">
                          {alert.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-600 font-inter line-clamp-2">
                        {alert.description}
                      </p>
                      <span className="text-[10px] text-slate-400 font-inter block pt-1">
                        {alert.timestamp}
                      </span>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-dark group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Recent Operational Activity Stream */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary-600" />
                <h3 className="font-bold text-dark text-sm font-poppins">
                  Recent Platform Activity
                </h3>
              </div>
              <Link
                href="/admin/audit-logs"
                className="text-xs text-primary-600 hover:underline font-inter"
              >
                View Audit
              </Link>
            </div>

            <div className="space-y-3">
              {(metrics.recentActivity || []).length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-inter">
                  No recent activity recorded yet.
                </div>
              ) : (
                (metrics.recentActivity || []).map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-100 flex items-start gap-2.5 text-xs font-inter"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                      {act.type === "request" && <Droplet className="w-3.5 h-3.5 text-rose-500" />}
                      {act.type === "donation" && <Heart className="w-3.5 h-3.5 text-emerald-500" />}
                      {act.type === "audit" && <Shield className="w-3.5 h-3.5 text-blue-500" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-dark font-medium leading-tight truncate">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {act.description}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {formatDate(act.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 4. National Blood Reserve Grid */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-dark text-base font-poppins">
              National Blood Reserve Grid
            </h3>
            <p className="text-xs text-slate-500 font-inter">
              Live inventory aggregated across certified hospital & blood bank vaults
            </p>
          </div>
          <Link
            href="/admin/inventory"
            className="text-xs text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-1 font-inter self-start sm:self-auto"
          >
            <span>Complete Inventory Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 sm:gap-3">
          {bloodGroupsList.map((bg) => {
            const count = metrics.inventory.stockByGroup[bg] || 0;

            return (
              <div
                key={bg}
                className="p-2 sm:p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 flex flex-col items-center justify-center text-center space-y-1 sm:space-y-1.5 transition-all hover:bg-white hover:shadow-xs hover:border-slate-200"
              >
                <BloodGroupBadge bloodGroup={bg} size="sm" />
                <span className="font-poppins text-base sm:text-lg font-bold text-dark leading-none mt-0.5 sm:mt-1">
                  {count}
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-inter truncate">
                  units
                </span>
                <div className="hidden xs:block">
                  <InventoryStatusBadge availableQuantity={count} size="sm" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 5. Recent Blood Requests Table */}
      <Card className="overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-dark text-base font-poppins">
              Recent Blood Requests
            </h3>
            <p className="text-xs text-slate-500 font-inter">
              Live broadcast stream of healthcare facility transfusion requests
            </p>
          </div>
          <Link
            href="/admin/blood-requests"
            className="text-xs text-primary-600 hover:underline font-inter flex items-center gap-1"
          >
            <span>View All Requests</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {metrics.recentRequests.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No requests yet"
              description="New hospital blood requests will appear here in real-time."
              icon={<Droplet className="w-8 h-8 text-primary-500" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Blood Group</TableHead>
                  <TableHead>Units Required</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.recentRequests.map((req: any) => {
                  const refCode = `BR-${req.id.slice(0, 8).toUpperCase()}`;

                  return (
                    <TableRow key={req.id} className="hover:bg-slate-50/60">
                      <TableCell className="font-mono text-xs font-bold text-slate-700">
                        {refCode}
                      </TableCell>
                      <TableCell className="text-xs font-inter">
                        <Link
                          href={`/admin/blood-requests/${req.id}`}
                          className="font-medium text-dark hover:text-primary-600 hover:underline block"
                        >
                          {req.organizations?.name || "Facility"}
                        </Link>
                        <span className="text-[10px] text-slate-400 block">
                          {req.organizations?.city}, {req.organizations?.state}
                        </span>
                      </TableCell>
                      <TableCell>
                        <BloodGroupBadge bloodGroup={req.blood_group} size="sm" />
                      </TableCell>
                      <TableCell className="text-xs font-inter">
                        <span className="font-bold text-dark">
                          {req.units_fulfilled || 0}
                        </span>{" "}
                        / {req.units_required} units
                      </TableCell>
                      <TableCell>
                        <UrgencyBadge urgency={req.urgency} size="sm" />
                      </TableCell>
                      <TableCell>
                        <RequestStatusBadge status={req.status} size="sm" />
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-500 font-inter">
                        {formatDate(req.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/blood-requests/${req.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium hover:underline font-inter"
                        >
                          <span>Review</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
