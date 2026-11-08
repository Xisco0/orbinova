import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adminService } from "@/services/adminService";
import {
  PageHeader,
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
import { BloodGroupBadge, RequestStatusBadge, UrgencyBadge } from "@/components/admin";
import { OrganizationDetailClient } from "./OrganizationDetailClient";
import {
  Building2,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  Users,
  Droplet,
  FileCheck,
  Calendar,
  ArrowLeft,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PageProps {
  params: {
    id: string;
  };
}

export const revalidate = 0;

export default async function OrganizationDetailPage({ params }: PageProps) {
  const { organization, members, inventory, recentRequests, error } =
    await adminService.getOrganizationById(params.id);

  if (error || !organization) {
    notFound();
  }

  const isBloodBank = organization.organization_type === "blood_bank";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/organizations"
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-inter"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Organizations</span>
        </Link>
      </div>

      <PageHeader
        title={organization.name}
        description={`${isBloodBank ? "Blood Bank Facility" : "Hospital Medical Center"} • Registration Profile`}
        badge={
          <Badge
            variant={isBloodBank ? "secondary" : "primary"}
            size="lg"
          >
            {isBloodBank ? "Blood Bank" : "Hospital"}
          </Badge>
        }
      />

      {/* Sensitive Action Controller */}
      <OrganizationDetailClient organization={organization} />

      {/* Core Facility Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact & Location Information */}
        <Card className="md:col-span-2 space-y-4">
          <CardHeader>
            <CardTitle>Facility Contact & Location</CardTitle>
            <CardDescription>Official registered institution coordinates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-inter">
              <div className="space-y-1">
                <span className="text-slate-400 block uppercase font-medium text-[10px]">Email Address</span>
                <div className="flex items-center gap-1.5 text-dark font-medium">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{organization.email}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block uppercase font-medium text-[10px]">Phone Number</span>
                <div className="flex items-center gap-1.5 text-dark font-medium">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{organization.phone || "Not provided"}</span>
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <span className="text-slate-400 block uppercase font-medium text-[10px]">Physical Street Address</span>
                <div className="flex items-start gap-1.5 text-dark font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {organization.address || "—"}, {organization.city || ""}, {organization.state || "Nigeria"}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block uppercase font-medium text-[10px]">License Number</span>
                <div className="flex items-center gap-1.5 text-dark font-medium">
                  <FileCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{organization.license_number || "Pending Registration"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 block uppercase font-medium text-[10px]">Registration Date</span>
                <div className="flex items-center gap-1.5 text-dark font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{formatDate(organization.created_at)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Overview */}
        <Card className="space-y-3">
          <CardHeader>
            <CardTitle>Verification State</CardTitle>
            <CardDescription>Clearance audit records</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs font-inter">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Status:</span>
                <span className="uppercase text-primary-700">{organization.verification_status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Verified At:</span>
                <span className="font-medium text-dark">{formatDate(organization.verified_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Active Account:</span>
                <span className="font-medium text-dark">{organization.is_active ? "Yes" : "No"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Authorized Organization Members */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-poppins text-base font-semibold text-dark">
              Authorized Staff & Managers ({members.length})
            </h3>
            <p className="text-xs text-slate-500 font-inter">
              Healthcare personnel authorized to manage this facility account
            </p>
          </div>
        </div>

        {members.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No staff members registered"
              description="This facility has no assigned staff accounts yet."
              icon={<Users className="w-6 h-6 text-slate-400" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Name</TableHead>
                <TableHead>Email Address</TableHead>
                <TableHead>Org Role</TableHead>
                <TableHead>Global Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member: any) => (
                <TableRow key={member.id}>
                  <TableCell className="text-dark text-xs">
                    {member.profiles?.full_name || "Staff Member"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {member.profiles?.email}
                  </TableCell>
                  <TableCell>
                    <Badge variant="primary" size="sm">
                      {member.member_role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 uppercase font-medium">
                    {member.profiles?.role}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.is_active ? "success" : "default"}
                      size="sm"
                    >
                      {member.is_active ? "Active" : "Deactivated"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[11px] text-slate-500">
                    {formatDate(member.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Facility Blood Stock & Requests Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Blood Stock */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-poppins text-base font-semibold text-dark">
              Facility Blood Stock
            </h3>
            <p className="text-xs text-slate-500 font-inter">
              Live inventory held at this facility
            </p>
          </div>
          {inventory.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No stock reported"
                description="Facility has not entered blood inventory counts yet."
                icon={<Droplet className="w-6 h-6 text-slate-400" />}
              />
            </div>
          ) : (
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {inventory.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col items-center justify-center text-center space-y-1"
                >
                  <BloodGroupBadge bloodGroup={inv.blood_group} size="sm" />
                  <span className="font-poppins text-base font-bold text-dark">
                    {inv.available_quantity}
                  </span>
                  <span className="text-[10px] text-slate-500">avail units</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Requests */}
        <Card className="p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-poppins text-base font-semibold text-dark">
              Recent Blood Requests
            </h3>
            <p className="text-xs text-slate-500 font-inter">
              Emergency broadcasts issued by this facility
            </p>
          </div>
          {recentRequests.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No requests issued"
                description="This facility has no blood requests on file."
                icon={<Droplet className="w-6 h-6 text-slate-400" />}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group</TableHead>
                  <TableHead>Units</TableHead>
                  <TableHead>Urgency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <BloodGroupBadge bloodGroup={req.blood_group} size="sm" />
                    </TableCell>
                    <TableCell className="text-xs">
                      {req.units_fulfilled} / {req.units_required}
                    </TableCell>
                    <TableCell>
                      <UrgencyBadge urgency={req.urgency} size="sm" />
                    </TableCell>
                    <TableCell>
                      <RequestStatusBadge status={req.status} size="sm" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
