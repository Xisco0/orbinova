import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminService } from "@/services/adminService";
import {
  PageHeader,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  EmptyState,
} from "@/components/ui";
import { BloodGroupBadge } from "@/components/admin";
import {
  Heart,
  Droplet,
  Calendar,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PageProps {
  params: {
    id: string;
  };
}

export const revalidate = 0;

export default async function DonorDetailPage({ params }: PageProps) {
  const { donor: rawDonor, donations, availabilityHistory, error } =
    await adminService.getDonorById(params.id);

  if (error || !rawDonor) {
    notFound();
  }

  const donor = rawDonor as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/donors"
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-inter"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Donors</span>
        </Link>
      </div>

      <PageHeader
        title={donor.profiles?.full_name || "Voluntary Donor Profile"}
        description={`Donor Reference: REF-${donor.id.substring(0, 8).toUpperCase()}`}
        badge={<BloodGroupBadge bloodGroup={donor.blood_group} size="lg" />}
      />

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-inter">
            Eligibility Status
          </span>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={
                donor.eligibility_status === "eligible"
                  ? "success"
                  : "warning"
              }
              size="md"
            >
              {donor.eligibility_status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-inter">
            Next Eligible: <strong>{formatDate(donor.next_eligible_date)}</strong>
          </p>
        </Card>

        <Card className="p-4">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-inter">
            Current Availability
          </span>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={
                donor.availability_status === "available"
                  ? "success"
                  : "default"
              }
              size="md"
            >
              {donor.availability_status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-inter">
            Location: {donor.city || "—"}, {donor.state || "Nigeria"}
          </p>
        </Card>

        <Card className="p-4">
          <span className="text-xs uppercase tracking-wider text-slate-500 font-inter">
            Total Completed Donations
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-poppins text-2xl font-bold text-dark">
              {donations.length}
            </span>
            <span className="text-xs text-slate-500 font-inter">transfusions</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-inter">
            Last: {formatDate(donor.last_donation_date)}
          </p>
        </Card>
      </div>

      {/* Donation History Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-poppins text-base font-semibold text-dark">
            Verified Donation History ({donations.length})
          </h3>
          <p className="text-xs text-slate-500 font-inter">
            Official records of blood units donated at authorized healthcare facilities
          </p>
        </div>

        {donations.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No donation records yet"
              description="This donor has not completed any logged blood donation appointments yet."
              icon={<Droplet className="w-6 h-6 text-slate-400" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units</TableHead>
                <TableHead>Donation Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((don: any) => (
                <TableRow key={don.id}>
                  <TableCell className="text-dark text-xs">
                    {don.organizations?.name || "Healthcare Facility"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {don.organizations?.city}, {don.organizations?.state}
                  </TableCell>
                  <TableCell>
                    <BloodGroupBadge bloodGroup={don.blood_group} size="sm" />
                  </TableCell>
                  <TableCell className="text-xs text-green-700">
                    +{don.units_donated} unit(s)
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {formatDate(don.donation_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" size="sm">
                      {don.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
