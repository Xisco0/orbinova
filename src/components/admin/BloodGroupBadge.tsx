import React from "react";
import { BloodGroupCode } from "@/types/database";
import { Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BloodGroupBadgeProps {
  bloodGroup: BloodGroupCode | string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showIcon?: boolean;
}

export const BloodGroupBadge: React.FC<BloodGroupBadgeProps> = ({
  bloodGroup,
  size = "md",
  className,
  showIcon = true,
}) => {
  const isNegative = bloodGroup.includes("-");

  const sizeMap = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3.5 py-1.5 text-sm font-bold",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg font-poppins font-bold select-none border transition-colors",
        isNegative
          ? "bg-blood-50 text-blood-700 border-blood-200"
          : "bg-primary-50 text-primary-700 border-primary-200",
        sizeMap[size],
        className
      )}
    >
      {showIcon && (
        <Droplet
          className={cn(
            "w-3.5 h-3.5",
            isNegative ? "text-blood-600 fill-blood-600" : "text-primary-600 fill-primary-600"
          )}
        />
      )}
      <span>{bloodGroup}</span>
    </span>
  );
};
