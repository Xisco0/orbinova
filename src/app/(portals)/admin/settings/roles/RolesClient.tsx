"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, Button, EmptyState } from "@/components/ui";
import {
  ROLE_CONFIGS,
  ADMIN_PERMISSIONS,
  normalizeAdminRole,
  getRolePermissions,
  PermissionKey,
} from "@/constants/permissions";
import { RoleDetailsModal } from "@/components/admin/RoleDetailsModal";
import { CreateAdminModal } from "@/components/admin/CreateAdminModal";
import {
  ShieldCheck,
  UserPlus,
  Search,
  Settings,
  Users,
  ChevronRight,
  Shield,
  Key,
} from "lucide-react";

interface RolesClientProps {
  roleCounts: Record<string, number>;
}

export function RolesClient({ roleCounts }: RolesClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [version, setVersion] = useState(0);

  // Re-sync on permission changes
  useEffect(() => {
    const handleUpdated = () => {
      setVersion((v) => v + 1);
    };
    window.addEventListener("smartdonor:permissions_updated", handleUpdated);
    return () => window.removeEventListener("smartdonor:permissions_updated", handleUpdated);
  }, []);

  // The 3 primary roles requested
  const primaryRoles = ["superadmin", "admin", "staff"];

  const filteredRoles = primaryRoles.filter((roleKey) => {
    const config = ROLE_CONFIGS[roleKey];
    if (!config) return false;
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;

    const matchesName = config.name.toLowerCase().includes(q);
    const matchesDesc = config.description.toLowerCase().includes(q);
    const matchesPerms = config.permissions.some((p) =>
      p.toLowerCase().replace(/_/g, " ").includes(q)
    );

    return matchesName || matchesDesc || matchesPerms;
  });

  return (
    <div className="space-y-6">
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <div className="border border-slate-200 bg-white rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-xs focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search role or permission..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs text-dark placeholder:text-slate-400 bg-transparent outline-none font-inter"
            />
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
          className="shadow-sm shrink-0"
        >
          Assign Administrator
        </Button>
      </div>

      {/* Role Cards Grid */}
      {filteredRoles.length === 0 ? (
        <Card className="p-12">
          <EmptyState
            title="No roles match your search"
            description="Try searching with a different term or keyword."
            icon={<ShieldCheck className="w-8 h-8 text-slate-400" />}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredRoles.map((roleKey) => {
            const config = ROLE_CONFIGS[roleKey];
            const userCount =
              (roleCounts[roleKey] || 0) +
              (roleKey === "superadmin" ? roleCounts["super_admin"] || 0 : 0) +
              (roleKey === "staff" ? (roleCounts["operations"] || 0) + (roleCounts["moderator"] || 0) : 0);

            return (
              <div
                key={roleKey}
                onClick={() => setSelectedRole(roleKey)}
                className="group relative overflow-hidden flex flex-col justify-between gap-4 p-5 rounded-xl border border-slate-200/80 bg-white shadow-xs transition-all duration-300 cursor-pointer hover:border-primary-400/60 hover:shadow-md hover:-translate-y-0.5"
              >
                {/* Ghost Background Icon */}
                <div className="absolute -bottom-3 -right-4 opacity-[0.03] text-primary-900 transition-all duration-500 group-hover:opacity-[0.08] group-hover:scale-110 group-hover:-rotate-12 pointer-events-none">
                  <ShieldCheck size={96} />
                </div>

                {/* Top Row: Icon + User Count */}
                <div className="relative z-10 flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shadow-xs transition-transform group-hover:scale-105 shrink-0">
                    <ShieldCheck size={20} />
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-xl font-black text-dark font-poppins leading-none">
                      {userCount}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5 font-inter">
                      Users
                    </span>
                  </div>
                </div>

                {/* Middle Content */}
                <div className="relative z-10 space-y-2">
                  <div>
                    <h3 className="font-bold text-dark text-base leading-tight transition-colors group-hover:text-primary-600 font-poppins">
                      {config.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-md border border-primary-100">
                        {getRolePermissions(roleKey).length} {getRolePermissions(roleKey).length === 1 ? "Permission" : "Permissions"}
                      </span>
                      <Badge variant={config.badgeVariant} size="sm">
                        {config.id.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 font-inter">
                    {config.description}
                  </p>
                </div>

                {/* Bottom Row: Permissions Preview */}
                <div className="relative z-10 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-primary-600 group-hover:text-primary-700">
                  <span>Edit & Configure Permissions</span>
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permissions Breakdown Table */}
      <Card className="p-5">
        <div className="mb-4">
          <h3 className="text-base font-bold text-dark font-poppins">
            Role Permission Comparison Matrix
          </h3>
          <p className="text-xs text-slate-500 font-inter">
            Side-by-side view of capabilities granted across Super Admin, Admin, and Operations Staff roles. Click any role above to customize permissions.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-inter border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3.5">Permission Module</th>
                <th className="py-2.5 px-3.5 text-center">Super Admin</th>
                <th className="py-2.5 px-3.5 text-center">Admin</th>
                <th className="py-2.5 px-3.5 text-center">Operations Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ADMIN_PERMISSIONS.map((perm) => {
                const superHas = getRolePermissions("superadmin").includes(perm.id);
                const adminHas = getRolePermissions("admin").includes(perm.id);
                const staffHas = getRolePermissions("staff").includes(perm.id);

                return (
                  <tr key={perm.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3.5">
                      <span className="text-dark block">{perm.name}</span>
                      <span className="text-[11px] text-slate-500">{perm.description}</span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className={`inline-block w-5 h-5 rounded-full text-center leading-5 ${superHas ? "bg-emerald-100 text-emerald-700 font-bold" : "bg-slate-100 text-slate-400"}`}>
                        {superHas ? "✓" : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className={`inline-block w-5 h-5 rounded-full text-center leading-5 ${adminHas ? "bg-emerald-100 text-emerald-700 font-bold" : "bg-slate-100 text-slate-400"}`}>
                        {adminHas ? "✓" : "—"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <span className={`inline-block w-5 h-5 rounded-full text-center leading-5 ${staffHas ? "bg-emerald-100 text-emerald-700 font-bold" : "bg-slate-100 text-slate-400"}`}>
                        {staffHas ? "✓" : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Role Details Inspector Modal */}
      {selectedRole && (
        <RoleDetailsModal
          isOpen={!!selectedRole}
          onClose={() => setSelectedRole(null)}
          roleKey={selectedRole}
          userCount={
            (roleCounts[selectedRole] || 0) +
            (selectedRole === "superadmin" ? roleCounts["super_admin"] || 0 : 0) +
            (selectedRole === "staff" ? (roleCounts["operations"] || 0) + (roleCounts["moderator"] || 0) : 0)
          }
        />
      )}

      {/* Create / Assign Admin Modal */}
      <CreateAdminModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
