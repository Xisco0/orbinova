import React from "react";
import { Badge } from "./Badge";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Activity,
  ShieldCheck,
  Ban,
} from "lucide-react";

export type StatusType =
  | "emergency"
  | "urgent"
  | "normal"
  | "verified"
  | "pending"
  | "active"
  | "inactive"
  | "rejected"
  | "suspended";

export interface StatusBadgeProps {
  status: StatusType | string;
  customLabel?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  customLabel,
  size = "md",
  className = "",
}) => {
  const normalized = status.toLowerCase() as StatusType;

  switch (normalized) {
    case "emergency":
      return (
        <Badge
          variant="emergency"
          size={size}
          icon={<AlertCircle className="w-3.5 h-3.5 text-blood-600" />}
          className={className}
        >
          {customLabel || "🔴 Emergency — Critical"}
        </Badge>
      );
    case "urgent":
      return (
        <Badge
          variant="warning"
          size={size}
          icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
          className={className}
        >
          {customLabel || "🟠 Urgent"}
        </Badge>
      );
    case "normal":
      return (
        <Badge
          variant="primary"
          size={size}
          icon={<Activity className="w-3.5 h-3.5 text-primary-600" />}
          className={className}
        >
          {customLabel || "Standard Priority"}
        </Badge>
      );
    case "verified":
      return (
        <Badge
          variant="success"
          size={size}
          icon={<ShieldCheck className="w-3.5 h-3.5 text-green-600" />}
          className={className}
        >
          {customLabel || "Verified"}
        </Badge>
      );
    case "active":
      return (
        <Badge
          variant="success"
          size={size}
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
          className={className}
        >
          {customLabel || "Active"}
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="warning"
          size={size}
          icon={<Clock className="w-3.5 h-3.5 text-amber-600" />}
          className={className}
        >
          {customLabel || "Pending Verification"}
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="blood"
          size={size}
          icon={<XCircle className="w-3.5 h-3.5 text-blood-600" />}
          className={className}
        >
          {customLabel || "Rejected"}
        </Badge>
      );
    case "suspended":
      return (
        <Badge
          variant="default"
          size={size}
          icon={<Ban className="w-3.5 h-3.5 text-slate-500" />}
          className={className}
        >
          {customLabel || "Suspended"}
        </Badge>
      );
    case "inactive":
    default:
      return (
        <Badge variant="default" size={size} className={className}>
          {customLabel || status}
        </Badge>
      );
  }
};
