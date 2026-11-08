import React from "react";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  variant?: "primary" | "secondary" | "blood" | "success" | "warning" | "default";
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  variant = "primary",
  trend,
  className,
}) => {
  const variantStyles = {
    primary: "bg-primary-50 text-primary-600 border-primary-100",
    secondary: "bg-secondary-50 text-secondary-600 border-secondary-100",
    blood: "bg-blood-50 text-blood-600 border-blood-100",
    success: "bg-green-50 text-green-600 border-green-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    default: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-500 font-inter">
          {title}
        </span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-xl border shrink-0",
            variantStyles[variant]
          )}
        >
          {icon}
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-poppins text-2xl sm:text-3xl font-bold tracking-tight text-dark">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium font-inter",
              trend.isPositive ? "text-green-600" : "text-slate-500"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-1 text-xs text-slate-500 font-inter">
          {description}
        </p>
      )}
    </div>
  );
};
