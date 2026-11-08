import React from "react";
import { RequestUrgency } from "@/types/database";
import { AlertCircle, AlertTriangle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface UrgencyBadgeProps {
  urgency: RequestUrgency | string;
  size?: "sm" | "md" | "lg";
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({
  urgency,
  size = "md",
}) => {
  switch (urgency) {
    case "emergency":
      return (
        <Badge
          variant="emergency"
          size={size}
          icon={<AlertCircle className="w-3.5 h-3.5 text-blood-700" />}
        >
          🔴 Emergency
        </Badge>
      );
    case "urgent":
      return (
        <Badge
          variant="warning"
          size={size}
          icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-700" />}
        >
          🟠 Urgent
        </Badge>
      );
    case "normal":
    default:
      return (
        <Badge
          variant="primary"
          size={size}
          icon={<Clock className="w-3.5 h-3.5 text-primary-600" />}
        >
          Standard
        </Badge>
      );
  }
};
