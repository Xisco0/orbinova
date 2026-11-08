import React from "react";
import { RequestStatus } from "@/types/database";
import { Activity, CheckCircle2, Clock, XCircle, AlertCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface RequestStatusBadgeProps {
  status: RequestStatus | string;
  size?: "sm" | "md" | "lg";
}

export const RequestStatusBadge: React.FC<RequestStatusBadgeProps> = ({
  status,
  size = "md",
}) => {
  switch (status) {
    case "open":
      return (
        <Badge
          variant="primary"
          size={size}
          icon={<Clock className="w-3.5 h-3.5 text-primary-600" />}
        >
          Open
        </Badge>
      );
    case "matching":
      return (
        <Badge
          variant="secondary"
          size={size}
          icon={<Activity className="w-3.5 h-3.5 text-secondary-600 animate-pulse" />}
        >
          Matching Active
        </Badge>
      );
    case "partially_fulfilled":
      return (
        <Badge
          variant="warning"
          size={size}
          icon={<Activity className="w-3.5 h-3.5 text-amber-600" />}
        >
          Partially Fulfilled
        </Badge>
      );
    case "fulfilled":
      return (
        <Badge
          variant="success"
          size={size}
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-600" />}
        >
          Fulfilled
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          variant="default"
          size={size}
          icon={<XCircle className="w-3.5 h-3.5 text-slate-500" />}
        >
          Cancelled
        </Badge>
      );
    case "expired":
      return (
        <Badge
          variant="blood"
          size={size}
          icon={<AlertCircle className="w-3.5 h-3.5 text-blood-600" />}
        >
          Expired
        </Badge>
      );
    case "draft":
    default:
      return (
        <Badge
          variant="default"
          size={size}
          icon={<FileText className="w-3.5 h-3.5 text-slate-400" />}
        >
          Draft
        </Badge>
      );
  }
};
