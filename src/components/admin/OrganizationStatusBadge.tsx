import React from "react";
import { VerificationStatus } from "@/types/database";
import { ShieldCheck, Clock, XCircle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface OrganizationStatusBadgeProps {
  status: VerificationStatus | string;
  size?: "sm" | "md" | "lg";
}

export const OrganizationStatusBadge: React.FC<OrganizationStatusBadgeProps> = ({
  status,
  size = "md",
}) => {
  switch (status) {
    case "verified":
      return (
        <Badge
          variant="success"
          size={size}
          icon={<ShieldCheck className="w-3.5 h-3.5 text-green-600" />}
        >
          Verified
        </Badge>
      );
    case "pending":
      return (
        <Badge
          variant="warning"
          size={size}
          icon={<Clock className="w-3.5 h-3.5 text-amber-600" />}
        >
          Pending Review
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="blood"
          size={size}
          icon={<XCircle className="w-3.5 h-3.5 text-blood-600" />}
        >
          Rejected
        </Badge>
      );
    case "suspended":
      return (
        <Badge
          variant="default"
          size={size}
          icon={<Ban className="w-3.5 h-3.5 text-slate-500" />}
        >
          Suspended
        </Badge>
      );
    default:
      return <Badge size={size}>{status}</Badge>;
  }
};
