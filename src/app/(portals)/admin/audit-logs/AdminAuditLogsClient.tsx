"use client";

import React, { useState, useTransition } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  Search,
  Filter,
  Eye,
  Calendar,
  Lock,
  Building2,
  User,
  Activity,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  Hash,
  X,
  AlertTriangle,
  RotateCcw,
  Globe,
} from "lucide-react";
import { StoredAuditLog } from "@/services/centralizedAuditService";
import { getAdminAuditLogsAction, exportAuditLogsAction } from "@/actions/auditActions";
import { Button, Card, Badge, EmptyState } from "@/components/ui";

interface AdminAuditLogsClientProps {
  initialLogs: StoredAuditLog[];
  initialTotalCount: number;
  initialTotalPages: number;
  initialMetrics: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    securityEvents: number;
    recentAdminChanges: number;
    chainValid: boolean;
  };
  knownOrganizations: Array<{ id: string; name: string; type: string }>;
}

export function AdminAuditLogsClient({
  initialLogs,
  initialTotalCount,
  initialTotalPages,
  initialMetrics,
  knownOrganizations,
}: AdminAuditLogsClientProps) {
  const [logs, setLogs] = useState<StoredAuditLog[]>(initialLogs);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [currentPage, setCurrentPage] = useState(1);

  // Filters state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedEntityType, setSelectedEntityType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<StoredAuditLog | null>(null);

  const applyFilters = (newPage = 1) => {
    startTransition(async () => {
      const res = await getAdminAuditLogsAction({
        organizationId: selectedOrgId !== "all" ? selectedOrgId : undefined,
        search: searchTerm || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        role: selectedRole !== "all" ? selectedRole : undefined,
        entityType: selectedEntityType !== "all" ? selectedEntityType : undefined,
        status: selectedStatus !== "all" ? selectedStatus : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: newPage,
        pageSize: 15,
      });

      if (res.success) {
        setLogs(res.logs);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        setCurrentPage(res.page);
        if (res.metrics) setMetrics(res.metrics);
      }
    });
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedOrgId("all");
    setSelectedCategory("all");
    setSelectedRole("all");
    setSelectedEntityType("all");
    setSelectedStatus("all");
    setStartDate("");
    setEndDate("");
    startTransition(async () => {
      const res = await getAdminAuditLogsAction({ page: 1, pageSize: 15 });
      if (res.success) {
        setLogs(res.logs);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        setCurrentPage(1);
        if (res.metrics) setMetrics(res.metrics);
      }
    });
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await exportAuditLogsAction("admin", {
        organizationId: selectedOrgId !== "all" ? selectedOrgId : "",
        search: searchTerm,
        category: selectedCategory !== "all" ? selectedCategory : "",
        role: selectedRole !== "all" ? selectedRole : "",
        status: selectedStatus !== "all" ? selectedStatus : "",
        startDate,
        endDate,
      });

      if (res.success && res.csvData) {
        const blob = new Blob([res.csvData], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", res.filename || "admin_audit_log.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-poppins text-2xl font-bold text-dark tracking-tight">
              Platform-Wide Audit & Security Trail
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-primary-50 border border-primary-200 text-primary-800 text-xs font-semibold">
              ORBINOVA Super Admin
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-inter mt-1">
            Comprehensive oversight across all hospitals, blood banks, and platform administrators.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cryptographic Chain Verified</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            isLoading={isExporting}
            loadingText="Exporting..."
            className="text-xs font-semibold border-slate-300"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider font-inter">
              Total Logged Events
            </span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-poppins text-2xl font-bold text-dark">
              {metrics.totalEvents.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-inter">Platform-Wide</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider font-inter">
              Successful Activities
            </span>
            <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-poppins text-2xl font-bold text-green-700">
              {metrics.successfulEvents.toLocaleString()}
            </span>
            <span className="text-[11px] text-green-600 font-inter">Verified</span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider font-inter">
              Security & Failure Events
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-poppins text-2xl font-bold text-amber-700">
              {metrics.failedEvents.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-inter">
              {metrics.securityEvents} Auth/Sec Events
            </span>
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider font-inter">
              Recent Admin Changes
            </span>
            <div className="w-8 h-8 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-poppins text-2xl font-bold text-primary-700">
              {metrics.recentAdminChanges.toLocaleString()}
            </span>
            <span className="text-[11px] text-slate-400 font-inter">Past 7 Days</span>
          </div>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 sm:p-5 bg-white border-slate-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters(1)}
              placeholder="Search actions, users, institutions, record IDs..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-dark placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:bg-white"
            />
          </div>

          {/* Institution Filter (Super Admin Exclusive) */}
          <div className="md:col-span-3">
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-dark focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:bg-white"
            >
              <option value="all">All Institutions (Global)</option>
              {knownOrganizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.type})
                </option>
              ))}
            </select>
          </div>

          {/* Action Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl text-dark focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:bg-white"
            >
              <option value="all">All Action Categories</option>
              <option value="authentication">Authentication & Security</option>
              <option value="staff_management">Staff & Permissions</option>
              <option value="donor_management">Donor Management</option>
              <option value="blood_requests">Blood Requests</option>
              <option value="blood_inventory">Blood Inventory</option>
              <option value="institutional_admin">Facility Administration</option>
              <option value="system_security">System Activities</option>
            </select>
          </div>

          {/* Filter Action Buttons */}
          <div className="md:col-span-2 flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => applyFilters(1)}
              isLoading={isPending}
              className="flex-1 text-xs py-2"
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              <span>Filter</span>
            </Button>
            <button
              type="button"
              onClick={handleResetFilters}
              title="Reset Filters"
              className="p-2 rounded-xl text-slate-400 hover:text-dark hover:bg-slate-100 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Date Range & Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-dark focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-dark focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Outcome Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-dark focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Outcomes</option>
              <option value="success">Success</option>
              <option value="failure">Failure / Blocked</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Affected Record Type</label>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-dark focus:outline-hidden focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Record Types</option>
              <option value="organizations">Organizations</option>
              <option value="organization_members">Staff & Members</option>
              <option value="donor_profiles">Donors</option>
              <option value="blood_requests">Blood Requests</option>
              <option value="blood_inventory">Blood Inventory</option>
              <option value="profiles">User Accounts</option>
              <option value="audit_logs">Audit Logs</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200 shadow-xs">
        {logs.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={<ShieldCheck className="w-8 h-8 text-slate-400" />}
              title="No Audit Records Found"
              description="No platform activity matches your selected search criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-inter">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Activity</th>
                  <th className="py-3 px-4">Affected Record</th>
                  <th className="py-3 px-4">Institution</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {logs.map((log) => {
                  const isSuccess = log.status !== "failure";

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50/75 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-dark">
                          {new Date(log.created_at).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(log.created_at).toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{log.actor_name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {log.user_id ? `ID: ${log.user_id.slice(0, 8)}...` : "System"}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-semibold capitalize">
                          {log.actor_role.replace("_", " ")}
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-dark truncate" title={log.description}>
                          {log.description}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 uppercase mt-0.5">
                          {log.action}
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-slate-700 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded-md">
                          {log.entity_type}
                        </span>
                        {log.entity_id && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            REF: {log.entity_id.slice(0, 8)}...
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 truncate max-w-[150px]">
                          {log.organization_name || "Platform Level"}
                        </div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {log.organization_type}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isSuccess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-[11px] font-semibold">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold">
                            <XCircle className="w-3 h-3 text-red-600" />
                            Failed
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-semibold text-xs px-2.5 py-1 rounded-lg hover:bg-primary-50 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <strong className="text-dark">{(currentPage - 1) * 15 + 1}</strong> to{" "}
              <strong className="text-dark">{Math.min(currentPage * 15, totalCount)}</strong> of{" "}
              <strong className="text-dark">{totalCount}</strong> entries
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isPending}
                onClick={() => applyFilters(currentPage - 1)}
                className="text-xs py-1 px-2.5"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>

              <span className="px-2 text-slate-600 font-semibold">
                Page {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || isPending}
                onClick={() => applyFilters(currentPage + 1)}
                className="text-xs py-1 px-2.5"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Event Details Modal */}
      {selectedLog && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/75 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-poppins font-bold text-base text-dark">
                    Audit Event Details
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      selectedLog.status !== "failure"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                    }`}
                  >
                    {selectedLog.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-mono">
                  EVENT ID: {selectedLog.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-dark hover:bg-slate-200/80 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto font-inter text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Activity Summary
                </div>
                <p className="text-sm font-semibold text-dark">
                  {selectedLog.description}
                </p>
                <div className="flex items-center gap-2 flex-wrap pt-1 font-mono text-[11px] text-slate-600">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200">
                    Action: {selectedLog.action}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 capitalize">
                    Category: {selectedLog.category.replace("_", " ")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Actor Information
                  </span>
                  <div className="font-semibold text-slate-800 text-sm">
                    {selectedLog.actor_name}
                  </div>
                  <div className="text-slate-500">
                    Role: <strong className="capitalize text-slate-700">{selectedLog.actor_role}</strong>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    User ID: {selectedLog.user_id || "System"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Institution Scope
                  </span>
                  <div className="font-semibold text-slate-800 text-sm">
                    {selectedLog.organization_name || "Platform Level"}
                  </div>
                  <div className="text-slate-500 capitalize">
                    Type: {selectedLog.organization_type.replace("_", " ")}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Org ID: {selectedLog.organization_id || "Global"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Affected Record
                  </span>
                  <div className="font-semibold text-slate-800 capitalize">
                    {selectedLog.entity_type}
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    ID: {selectedLog.entity_id || "N/A"}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Network Context
                  </span>
                  <div className="text-slate-700">
                    IP Address: <span className="font-mono">{selectedLog.ip_address || "127.0.0.1"}</span>
                  </div>
                  <div className="text-slate-400 text-[10px] truncate" title={selectedLog.user_agent || ""}>
                    Device: {selectedLog.user_agent || "Direct Client API"}
                  </div>
                </div>
              </div>

              {(selectedLog.previous_values || selectedLog.new_values) && (
                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    State Mutation Details (Sanitized)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 overflow-x-auto">
                      <span className="font-bold text-slate-600 block mb-1">Previous Values:</span>
                      <pre className="text-slate-700 whitespace-pre-wrap break-all">
                        {selectedLog.previous_values
                          ? JSON.stringify(selectedLog.previous_values, null, 2)
                          : "None (Initial Creation)"}
                      </pre>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 overflow-x-auto">
                      <span className="font-bold text-slate-600 block mb-1">New Values:</span>
                      <pre className="text-slate-700 whitespace-pre-wrap break-all">
                        {selectedLog.new_values
                          ? JSON.stringify(selectedLog.new_values, null, 2)
                          : "None"}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-900 text-slate-300 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-400 pb-1 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    Cryptographic Hash-Chain Verification
                  </span>
                  <span className="text-emerald-400 text-[10px]">Immutable SHA-256</span>
                </div>

                <div className="space-y-1 pt-1 break-all">
                  <div>
                    <span className="text-slate-500">Record Hash: </span>
                    <span className="text-emerald-300 font-semibold">{selectedLog.hash}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Previous Hash: </span>
                    <span className="text-slate-400">{selectedLog.previous_hash}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 font-inter">
                Logged at: {new Date(selectedLog.created_at).toUTCString()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
                className="text-xs"
              >
                Close Details
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
