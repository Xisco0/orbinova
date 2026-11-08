"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  EmptyState,
  useToast,
} from "@/components/ui";
import { CreateAdminModal } from "@/components/admin/CreateAdminModal";
import { updateAdminRoleAction, toggleUserStatusAction } from "@/actions/adminActions";
import { Profile, AdminRole } from "@/types/database";
import { ShieldCheck, UserPlus, ShieldAlert, CheckCircle, XCircle, Key } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AdminsClientProps {
  admins: Profile[];
  currentUserId: string;
}

export function AdminsClient({ admins, currentUserId }: AdminsClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingAdmin, setEditingAdmin] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole>("admin");

  const handleToggleStatus = async (admin: Profile) => {
    if (admin.id === currentUserId) {
      toast.warning("Action Not Permitted", "You cannot deactivate your own administrative account.");
      return;
    }

    setProcessingId(admin.id);
    try {
      const res = await toggleUserStatusAction(admin.id, !admin.is_active);
      if (!res.success) {
        toast.error("Status Update Failed", res.error || "Failed to update admin status.");
      } else {
        toast.success("Status Updated", `Admin ${admin.full_name} is now ${!admin.is_active ? "active" : "inactive"}.`);
        router.refresh();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleRoleUpdate = async (admin: Profile, newRole: AdminRole) => {
    setProcessingId(admin.id);
    try {
      const res = await updateAdminRoleAction(admin.id, newRole);
      if (!res.success) {
        toast.error("Role Update Failed", res.error || "Failed to update role.");
      } else {
        toast.success("Role Updated", `Role updated for ${admin.full_name}.`);
        setEditingAdmin(null);
        router.refresh();
      }
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleBadge = (role?: AdminRole | null) => {
    switch (role) {
      case "superadmin":
      case "super_admin":
        return <Badge variant="primary" size="sm">Super Admin</Badge>;
      case "admin":
        return <Badge variant="secondary" size="sm">Administrator</Badge>;
      case "staff":
      case "operations":
      case "moderator":
      default:
        return <Badge variant="default" size="sm">Staff</Badge>;
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-poppins text-dark">
            System Administrators Roster
          </h2>
          <p className="text-xs text-slate-500 font-inter">
            Manage administrative clearance, assigned roles, and operational permissions.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
          className="shadow-sm"
        >
          Create Administrator
        </Button>
      </div>

      {/* Admins Table */}
      <Card className="p-0 overflow-hidden mt-6">
        {admins.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No other administrators found"
              description="You are currently logged in as the active administrator. Use 'Create Administrator' to provision additional staff or delegated admin accounts."
              icon={<ShieldCheck className="w-8 h-8 text-primary-500" />}
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Administrator</TableHead>
                <TableHead>Assigned Role</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead className="text-right">Manage Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((adm) => {
                const isSelf = adm.id === currentUserId;
                const isSuperAdmin = adm.admin_role === "super_admin";

                return (
                  <TableRow key={adm.id}>
                    <TableCell className="text-dark text-xs font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-800 font-bold text-xs flex items-center justify-center">
                          {adm.full_name ? adm.full_name.charAt(0).toUpperCase() : "A"}
                        </div>
                        <div>
                          <p className="font-semibold text-dark flex items-center gap-1.5">
                            <span>{adm.full_name || "Administrator"}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                (You)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 font-normal">{adm.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {editingAdmin?.id === adm.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={selectedRole}
                            onChange={(e) => setSelectedRole(e.target.value as AdminRole)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                          >
                            <option value="super_admin">Super Admin</option>
                            <option value="admin">Admin</option>
                            <option value="operations">Operations</option>
                            <option value="moderator">Moderator</option>
                          </select>
                          <Button
                            size="sm"
                            variant="primary"
                            className="text-[11px] px-2 py-1 h-auto"
                            onClick={() => handleRoleUpdate(adm, selectedRole)}
                            isLoading={processingId === adm.id}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[11px] px-2 py-1 h-auto"
                            onClick={() => setEditingAdmin(null)}
                          >
                            ✕
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {getRoleBadge(adm.admin_role)}
                          {!isSelf && (
                            <button
                              onClick={() => {
                                setEditingAdmin(adm);
                                setSelectedRole(adm.admin_role || "admin");
                              }}
                              className="text-[10px] text-primary-600 hover:underline"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {adm.phone || "—"}
                    </TableCell>

                    <TableCell>
                      <Badge variant={adm.is_active ? "success" : "default"} size="sm">
                        {adm.is_active ? "Active" : "Deactivated"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-[11px] text-slate-500">
                      {formatDate(adm.created_at)}
                    </TableCell>

                    <TableCell className="text-right">
                      {!isSelf ? (
                        <Button
                          variant={adm.is_active ? "outline" : "primary"}
                          size="sm"
                          className={`text-xs ${
                            adm.is_active ? "text-blood-600 hover:bg-blood-50 hover:text-blood-700" : ""
                          }`}
                          onClick={() => handleToggleStatus(adm)}
                          isLoading={processingId === adm.id}
                        >
                          {adm.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Active Session</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <CreateAdminModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
