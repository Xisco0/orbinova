"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Badge, Button } from "@/components/ui";
import {
  ADMIN_PERMISSIONS,
  ROLE_CONFIGS,
  PermissionKey,
  RoleConfig,
  normalizeAdminRole,
  getRolePermissions,
  saveCustomRolePermissions,
} from "@/constants/permissions";
import { updateRolePermissionsAction } from "@/actions/adminActions";
import { ShieldCheck, Check, Users, Lock, X, BellRing, Loader2, Activity } from "lucide-react";

interface RoleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roleKey: string | null;
  userCount?: number;
  onPermissionsUpdated?: () => void;
}

export function RoleDetailsModal({
  isOpen,
  onClose,
  roleKey,
  userCount = 0,
  onPermissionsUpdated,
}: RoleDetailsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const normalized = roleKey ? normalizeAdminRole(roleKey) : "admin";
  const config = ROLE_CONFIGS[normalized] || ROLE_CONFIGS.admin;
  const isSuperAdmin = normalized === "superadmin";

  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; text: string } | null>(null);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Initialize selected permissions from active role configuration or custom storage
  useEffect(() => {
    if (!roleKey) return;
    const currentPerms = getRolePermissions(normalized);
    const permMap: Record<string, boolean> = {};
    ADMIN_PERMISSIONS.forEach((p) => {
      permMap[p.id] = currentPerms.includes(p.id);
    });
    setSelectedPermissions(permMap);
    setFeedback(null);
  }, [roleKey, normalized]);

  if (!isOpen || !roleKey || !mounted) return null;

  const handleToggle = (permId: string) => {
    setSelectedPermissions((prev) => ({
      ...prev,
      [permId]: !prev[permId],
    }));
  };

  const handleSelectAll = () => {
    const allSelected = ADMIN_PERMISSIONS.every((p) => selectedPermissions[p.id]);
    const updated: Record<string, boolean> = {};
    ADMIN_PERMISSIONS.forEach((p) => {
      updated[p.id] = !allSelected;
    });
    setSelectedPermissions(updated);
  };

  const handleSave = async () => {
    const activePerms = Object.keys(selectedPermissions).filter(
      (k) => selectedPermissions[k]
    ) as PermissionKey[];

    setIsSubmitting(true);
    setFeedback(null);

    try {
      // 1. Persist in local storage & dispatch global update event
      saveCustomRolePermissions(normalized, activePerms);

      // 2. Invoke server action for audit logging & cache revalidation
      const res = await updateRolePermissionsAction(normalized, activePerms);
      if (!res.success) {
        setFeedback({ success: false, text: res.error || "Failed to update permissions." });
      } else {
        setFeedback({ success: true, text: "Permissions updated and applied successfully!" });
        onPermissionsUpdated?.();
        setTimeout(() => {
          onClose();
        }, 900);
      }
    } catch (err: any) {
      setFeedback({ success: false, text: err.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = Object.values(selectedPermissions).filter(Boolean).length;
  const isAllSelected = selectedCount === ADMIN_PERMISSIONS.length;
  const categories = Array.from(new Set(ADMIN_PERMISSIONS.map((p) => p.category)));

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex justify-end">
      {/* Global Full-Screen Backdrop covering entire viewport, sidebar & header */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Full-Height Right-Side Slide-Over Drawer */}
      <div className="relative z-[10000] w-full max-w-md bg-white h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-dark font-poppins text-lg">
                  {config.name}
                </h3>
                <Badge variant={config.badgeVariant} size="sm">
                  {config.id.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-inter">
                Configure access controls and toggle active permissions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-dark transition-colors cursor-pointer"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Info Notice Banner */}
          <div className="p-3.5 rounded-xl bg-primary-50/70 border border-primary-100 flex items-start gap-2.5 text-xs text-primary-900 font-inter">
            <BellRing className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
            <span>
              Toggle the permission switches below to grant or restrict capabilities for this role. Changes take effect across all portal sessions immediately.
            </span>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-inter animate-fadeIn ${
                feedback.success
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                  : "bg-blood-50 text-blood-800 border border-blood-200"
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Role Summary Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs font-inter">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Clearance Scope
              </span>
              <p className="text-dark">{config.description}</p>
            </div>
            <div className="text-right pl-3 shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Assigned Staff
              </span>
              <span className="font-bold text-dark text-sm">{userCount} Users</span>
            </div>
          </div>

          {/* Permissions Matrix Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-dark font-poppins">
                  Assigned Permissions Matrix
                </h4>
                <p className="text-xs text-slate-500 font-inter">
                  Control operational access by toggling specific permissions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
                  {selectedCount} / {ADMIN_PERMISSIONS.length} Enabled
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-primary-600 hover:text-primary-800 hover:underline cursor-pointer"
                >
                  {isAllSelected ? "Deselect All" : "Select All"}
                </button>
              </div>
            </div>

            {/* Categorized Permissions with Switches */}
            <div className="space-y-3.5">
              {categories.map((category) => {
                const perms = ADMIN_PERMISSIONS.filter((p) => p.category === category);
                const enabledCount = perms.filter((p) => selectedPermissions[p.id]).length;

                return (
                  <div
                    key={category}
                    className="rounded-xl border border-slate-200/80 overflow-hidden bg-white shadow-xs"
                  >
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-700 font-inter">
                      <span className="text-slate-800">{category}</span>
                      <span className="text-[11px] text-slate-400">
                        {enabledCount} / {perms.length} Active
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {perms.map((perm) => {
                        const isChecked = !!selectedPermissions[perm.id];

                        return (
                          <div
                            key={perm.id}
                            className={`p-3.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                              isChecked ? "bg-white" : "bg-slate-50/40 opacity-75"
                            }`}
                          >
                            <div className="pr-2">
                              <span className="text-dark block font-inter">
                                {perm.name}
                              </span>
                              <span className="text-[11px] text-slate-500 font-inter block mt-0.5">
                                {perm.description}
                              </span>
                            </div>

                            {/* iOS Style Interactive Toggle Switch */}
                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggle(perm.id)}
                                disabled={isSubmitting}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Drawer Sticky Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            isLoading={isSubmitting}
            leftIcon={<Check className="w-4 h-4" />}
            className="shadow-sm"
          >
            Save & Update Role
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
