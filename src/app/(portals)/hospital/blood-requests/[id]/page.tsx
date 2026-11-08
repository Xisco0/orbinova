import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Droplet, Clock, HeartHandshake, CheckCircle2, AlertTriangle, User, Activity, Truck, Package, ShieldCheck, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/supabase/server";
import { hospitalService } from "@/services/hospitalService";
import { isHospitalParentOf } from "@/services/bloodRequestWorkflow";
import { PageHeader, Card, Badge, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { RequestDetailActions } from "./RequestDetailActions";
import { ReservationActions } from "./ReservationActions";
import { HospitalScreeningManager } from "@/components/hospital/HospitalScreeningManager";
import { screeningStore } from "@/services/screeningStore";
import { Building2, PackageCheck } from "lucide-react";

export const revalidate = 0;

interface PageProps {
  params: { id: string };
}

export default async function HospitalBloodRequestDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await hospitalService.getHospitalContext(user.id);
  if (!context) redirect("/hospital");

  const data = await hospitalService.getBloodRequestById(
    context.organization.id,
    params.id
  );

  if (!data) {
    notFound();
  }

  const { request, donorRequests, reservations = [] } = data;
  const hospitalScreenings = screeningStore.getByBloodRequest(request.id);
  const hospitalName = context.organization.name || "ORBINOVA Healthcare Center";
  const hospitalAddress =
    (context.organization as any).address ||
    `${context.organization.city || "Lagos"}, ${context.organization.state || "Nigeria"}`;

  // Independent Multi-Stage Quantity Calculations
  const unitsRequested = request.units_required;
  const unitsReserved =
    request.units_reserved ??
    reservations
      .filter((r: any) => r.status === "reserved" || r.status === "preparing")
      .reduce((acc: number, r: any) => acc + r.quantity, 0);

  const unitsIssued =
    request.units_issued ??
    reservations
      .filter((r: any) => r.status === "issued" || r.status === "in_transit")
      .reduce((acc: number, r: any) => acc + r.quantity, 0);

  const unitsReceived =
    request.units_received ??
    reservations
      .filter((r: any) => r.status === "received" || r.status === "delivered")
      .reduce((acc: number, r: any) => acc + r.quantity, 0);

  const unitsFulfilled = request.units_fulfilled ?? unitsReceived;
  const remainingNeed =
    request.remaining_shortage ??
    Math.max(0, unitsRequested - unitsReserved - unitsIssued - unitsFulfilled);

  const isFulfilled = unitsFulfilled >= unitsRequested || request.status === "fulfilled";
  const fulfillmentProgress = Math.min(100, Math.round((unitsFulfilled / unitsRequested) * 100));

  const formatStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case "partially_reserved":
        return "Partially Reserved";
      case "fully_reserved":
        return "Fully Reserved";
      case "awaiting_issuance":
        return "Awaiting Issuance";
      case "partially_issued":
        return "Partially Issued";
      case "fully_issued":
        return "Fully Issued";
      case "in_transit":
        return "In Transit";
      case "partially_received":
        return "Partially Received";
      case "fully_received":
        return "Fully Received";
      case "partially_fulfilled":
        return "Partially Fulfilled";
      case "fulfilled":
        return "Fulfilled";
      case "donor_matching":
        return "Donor Matching Active";
      case "awaiting_donor_responses":
        return "Awaiting Donor Responses";
      case "awaiting_donor_screening":
        return "Awaiting Donor Screening";
      case "pending":
        return "Pending Processing";
      case "checking_inventory":
        return "Checking Inventory";
      case "matching_blood_banks":
        return "Matching Blood Banks";
      case "cancelled":
        return "Cancelled";
      case "expired":
        return "Expired";
      default:
        return (status || "Open").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/hospital/blood-requests"
        className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-dark transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Blood Requests</span>
      </Link>

      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-poppins font-bold text-2xl text-dark">
              Request: REQ-{request.id.substring(0, 8).toUpperCase()}
            </h1>
            <Badge
              variant={
                isFulfilled
                  ? "success"
                  : request.status === "fully_reserved" || request.status === "partially_reserved"
                  ? "primary"
                  : request.status === "partially_issued" || request.status === "fully_issued"
                  ? "accent"
                  : request.urgency === "emergency"
                  ? "secondary"
                  : "default"
              }
              size="md"
            >
              {formatStatusLabel(request.status)}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 font-inter mt-1">
            Created on{" "}
            {new Date(request.created_at).toLocaleDateString("en-NG", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        <RequestDetailActions
          request={request}
          canManage={context.isManager}
        />
      </div>

      {/* 6 Independent Stage Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Requested */}
        <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-1 shadow-2xs">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-inter">
            Units Requested
          </span>
          <p className="text-xl font-bold text-dark font-poppins">
            {unitsRequested} <span className="text-xs font-normal text-slate-500 font-inter">({request.blood_group})</span>
          </p>
          <span className="text-[10px] text-slate-400 block font-inter">Total Required</span>
        </div>

        {/* 2. Reserved */}
        <div className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200/80 space-y-1 shadow-2xs">
          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block font-inter">
            Units Reserved
          </span>
          <p className="text-xl font-bold text-amber-700 font-poppins">
            {unitsReserved}
          </p>
          <span className="text-[10px] text-amber-600 block font-inter">Secured in Stock</span>
        </div>

        {/* 3. Issued */}
        <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-1 shadow-2xs">
          <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block font-inter">
            Units Issued
          </span>
          <p className="text-xl font-bold text-blue-700 font-poppins">
            {unitsIssued}
          </p>
          <span className="text-[10px] text-blue-600 block font-inter">In Transit / Ready</span>
        </div>

        {/* 4. Received */}
        <div className="p-3.5 rounded-xl bg-teal-50/40 border border-teal-200/80 space-y-1 shadow-2xs">
          <span className="text-[10px] text-teal-700 font-bold uppercase tracking-wider block font-inter">
            Units Received
          </span>
          <p className="text-xl font-bold text-teal-800 font-poppins">
            {unitsReceived}
          </p>
          <span className="text-[10px] text-teal-600 block font-inter">At Facility</span>
        </div>

        {/* 5. Fulfilled */}
        <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1 shadow-2xs">
          <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block font-inter">
            Units Fulfilled
          </span>
          <p className="text-xl font-bold text-emerald-700 font-poppins">
            {unitsFulfilled}
          </p>
          <span className="text-[10px] text-emerald-600 block font-inter">Confirmed Received</span>
        </div>

        {/* 6. Remaining Need */}
        <div className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200/80 space-y-1 shadow-2xs">
          <span className="text-[10px] text-rose-700 font-bold uppercase tracking-wider block font-inter">
            Remaining Need
          </span>
          <p className="text-xl font-bold text-rose-700 font-poppins">
            {remainingNeed}
          </p>
          <span className="text-[10px] text-rose-600 block font-inter">Sourcing Shortage</span>
        </div>
      </div>

      {/* Progress & Clinical Case Notes */}
      <Card className="p-5 sm:p-6 bg-white border-slate-200 space-y-4 shadow-2xs">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-inter">
            <span className="text-slate-600 font-medium">
              Confirmed Fulfillment Progress
            </span>
            <span className="text-dark font-bold">
              {fulfillmentProgress}% ({unitsFulfilled}/{unitsRequested} Units Fulfilled)
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                fulfillmentProgress === 100
                  ? "bg-emerald-600"
                  : fulfillmentProgress > 0
                  ? "bg-teal-600"
                  : "bg-amber-500"
              }`}
              style={{ width: `${fulfillmentProgress}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 font-inter">
            * Note: Progress is calculated strictly from confirmed received &amp; fulfilled units. Active reservations ({unitsReserved} units) and dispatched units ({unitsIssued} units) are tracked independently and do not count toward completed fulfillment until physically received.
          </p>
        </div>

        {request.notes && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 font-inter">
            <strong className="text-dark block mb-1">Clinical Case Notes:</strong>
            <span>{request.notes}</span>
          </div>
        )}

        {/* Request Activity Timeline */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-3 font-inter">
            Fulfillment Stage Pipeline
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs font-inter">
            <div className={`p-2.5 rounded-lg border ${unitsReserved > 0 || unitsFulfilled > 0 ? "bg-amber-50/60 border-amber-200 text-amber-900" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>1. Stock Reserved</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {unitsReserved > 0 ? `${unitsReserved} units locked` : "Awaiting reservation"}
              </p>
            </div>

            <div className={`p-2.5 rounded-lg border ${unitsIssued > 0 || unitsFulfilled > 0 ? "bg-blue-50/60 border-blue-200 text-blue-900" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <Truck className="w-3.5 h-3.5" />
                <span>2. Dispatched / Transit</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {unitsIssued > 0 ? `${unitsIssued} units en route` : "Pending issuance"}
              </p>
            </div>

            <div className={`p-2.5 rounded-lg border ${unitsReceived > 0 || unitsFulfilled > 0 ? "bg-teal-50/60 border-teal-200 text-teal-900" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <Package className="w-3.5 h-3.5" />
                <span>3. Received at Ward</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {unitsReceived > 0 ? `${unitsReceived} units checked in` : "Pending check-in"}
              </p>
            </div>

            <div className={`p-2.5 rounded-lg border ${isFulfilled ? "bg-emerald-50/60 border-emerald-200 text-emerald-900" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
              <div className="flex items-center gap-1.5 font-bold mb-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>4. Complete Fulfillment</span>
              </div>
              <p className="text-[11px] text-slate-600">
                {isFulfilled ? "100% Satisfied" : `${remainingNeed} units needed`}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Blood Bank Allocations & Reservations */}
      {reservations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-poppins font-bold text-base text-dark flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-teal-600" />
              <span>Blood Bank Stock Allocations ({reservations.length})</span>
            </h3>
            <span className="text-xs text-slate-400">
              Atomic double-reservation protected
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source Facility</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires In</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((res: any) => {
                  const isSourceOrg =
                    res.sourceOrgId === context.organization.id ||
                    isHospitalParentOf(context.organization.id, res.sourceOrgId || res.source_organization_id);
                  const isRequestingHosp = res.requestingHospitalId === context.organization.id;
                  const timeLeftMs = new Date(res.expiresAt).getTime() - Date.now();
                  const timeLeftMins = Math.max(0, Math.round(timeLeftMs / 60000));

                  return (
                    <TableRow key={res.id}>
                      <TableCell className="font-medium text-xs text-dark">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{res.sourceOrgName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-xs text-slate-600">
                        {(res.componentType || "red_cells").replace("_", " ")}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-blood-700">
                        {res.quantity} Units ({res.bloodGroup})
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            res.status === "issued"
                              ? "success"
                              : res.status === "preparing"
                              ? "accent"
                              : res.status === "reserved"
                              ? "primary"
                              : "default"
                          }
                          size="sm"
                        >
                          {res.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {res.status === "reserved" || res.status === "preparing"
                          ? `${timeLeftMins}m remaining`
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <ReservationActions
                          reservation={res}
                          currentOrgId={context.organization.id}
                          isSourceOrg={isSourceOrg}
                          isRequestingHospital={isRequestingHosp}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Matched Candidate Donors (Privacy-Conscious) & Screening Appointments */}
      <HospitalScreeningManager
        donorRequests={donorRequests}
        screenings={hospitalScreenings}
        hospitalName={hospitalName}
        hospitalAddress={hospitalAddress}
        canManage={Boolean(context.isManager || context.isOwner)}
      />
    </div>
  );
}
