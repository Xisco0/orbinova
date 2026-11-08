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
import { UserDetailClient } from "./UserDetailClient";
import { BloodGroupBadge } from "@/components/admin";
import {
  Users,
  Mail,
  Phone,
  Shield,
  Building2,
  Heart,
  Calendar,
  ArrowLeft,
  Activity,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface PageProps {
  params: {
    id: string;
  };
}

export const revalidate = 0;

export default async function UserDetailPage({ params }: PageProps) {
  const { user, memberships, donorProfile, recentAuditLogs, error } =
    await adminService.getUserById(params.id);

  if (error || !user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline font-inter"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Users</span>
        </Link>
      </div>

      <PageHeader
        title={user.full_name || "User Account"}
        description={`Identity clearance & system role: ${user.role.toUpperCase()}`}
        badge={
          <Badge
            variant={
              user.role === "admin"
                ? "primary"
                : user.role === "donor"
                ? "blood"
                : "secondary"
            }
            size="lg"
          >
            {user.role === "blood_bank" ? "Blood Bank" : user.role.toUpperCase()}
          </Badge>
        }
      />

      {/* Sensitive Action Controller */}
      <UserDetailClient user={user} />

      {/* Account Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Credentials & Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Identity</CardTitle>
            <CardDescription>Authentication & contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-xs font-inter">
            <div className="space-y-1">
              <span className="text-slate-400 block uppercase font-medium text-[10px]">Email Address</span>
              <div className="flex items-center gap-1.5 text-dark font-medium">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{user.email}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block uppercase font-medium text-[10px]">Phone Number</span>
              <div className="flex items-center gap-1.5 text-dark font-medium">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{user.phone || "Not recorded"}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-slate-400 block uppercase font-medium text-[10px]">System Registration Date</span>
              <div className="flex items-center gap-1.5 text-dark font-medium">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{formatDate(user.created_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Linked Entity Summary (Organization or Donor) */}
        <Card>
          <CardHeader>
            <CardTitle>Linked Entity Profile</CardTitle>
            <CardDescription>Associated healthcare records</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs font-inter">
            {donorProfile ? (
              <div className="p-3.5 rounded-xl bg-blood-50/60 border border-blood-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Blood Group:</span>
                  <BloodGroupBadge bloodGroup={donorProfile.blood_group} size="sm" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Availability:</span>
                  <Badge variant="primary" size="sm">{donorProfile.availability_status}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Eligibility:</span>
                  <Badge variant="success" size="sm">{donorProfile.eligibility_status}</Badge>
                </div>
                <div className="pt-1">
                  <Link
                    href={`/admin/donors/${donorProfile.id}`}
                    className="text-xs text-blood-700 hover:underline"
                  >
                    Inspect Full Donor Record →
                  </Link>
                </div>
              </div>
            ) : memberships.length > 0 ? (
              <div className="space-y-2">
                {memberships.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-dark text-xs font-poppins">
                        {m.organizations?.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {m.organizations?.city}, {m.organizations?.state} • Role: {m.member_role}
                      </p>
                    </div>
                    <Link
                      href={`/admin/organizations/${m.organizations?.id}`}
                      className="text-xs text-primary-600 hover:underline"
                    >
                      View Org →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-4 text-center text-slate-400">
                <span>Standard User Account (No external facility linked)</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent User Activity Audit Logs */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-poppins text-base font-semibold text-dark">
            Recent Audit Trail for User
          </h3>
          <p className="text-xs text-slate-500 font-inter">
            Security actions and modifications involving this identity
          </p>
        </div>

        {recentAuditLogs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No audit entries"
              description="No recent security events recorded for this user."
              icon={<Activity className="w-6 h-6 text-slate-400" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAuditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-[11px] text-slate-500">
                    {formatDate(log.created_at)}
                  </TableCell>
                  <TableCell className="text-xs text-dark">
                    <Badge variant="default" size="sm">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {log.entity_type}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {log.metadata ? JSON.stringify(log.metadata) : "—"}
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
