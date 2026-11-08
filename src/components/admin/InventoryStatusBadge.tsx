import React from "react";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface InventoryStatusBadgeProps {
  availableQuantity: number;
  criticalThreshold?: number;
  lowThreshold?: number;
  size?: "sm" | "md" | "lg";
}

export const InventoryStatusBadge: React.FC<InventoryStatusBadgeProps> = ({
  availableQuantity,
  criticalThreshold = 3,
  lowThreshold = 10,
  size = "md",
}) => {
  if (availableQuantity < criticalThreshold) {
    return (
      <Badge
        variant="emergency"
        size={size}
        icon={<AlertCircle className="w-3.5 h-3.5 text-blood-700" />}
      >
        Critical ({availableQuantity} units)
      </Badge>
    );
  }

  if (availableQuantity < lowThreshold) {
    return (
      <Badge
        variant="warning"
        size={size}
        icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-700" />}
      >
        Low Reserve ({availableQuantity} units)
      </Badge>
    );
  }

  return (
    <Badge
      variant="success"
      size={size}
      icon={<CheckCircle2 className="w-3.5 h-3.5 text-green-700" />}
    >
      Healthy ({availableQuantity} units)
    </Badge>
  );
};
