import React from "react";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface DonorStatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "blood" | "primary" | "secondary" | "success" | "warning" | "default";
  href?: string;
  actionText?: string;
}

export function DonorStatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  variant = "default",
  href,
  actionText,
}: DonorStatCardProps) {
  const variantStyles = {
    blood: {
      bg: "bg-blood-50/70 border-blood-100",
      iconBg: "bg-blood-600 text-white",
      valueColor: "text-blood-700",
    },
    primary: {
      bg: "bg-blue-50/70 border-blue-100",
      iconBg: "bg-primary-600 text-white",
      valueColor: "text-primary-700",
    },
    secondary: {
      bg: "bg-teal-50/70 border-teal-100",
      iconBg: "bg-secondary-600 text-white",
      valueColor: "text-secondary-700",
    },
    success: {
      bg: "bg-emerald-50/70 border-emerald-100",
      iconBg: "bg-emerald-600 text-white",
      valueColor: "text-emerald-700",
    },
    warning: {
      bg: "bg-amber-50/70 border-amber-100",
      iconBg: "bg-amber-600 text-white",
      valueColor: "text-amber-700",
    },
    default: {
      bg: "bg-white border-slate-200",
      iconBg: "bg-slate-100 text-slate-700",
      valueColor: "text-slate-900",
    },
  };

  const style = variantStyles[variant];

  const content = (
    <div
      className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border transition-all ${
        style.bg
      } ${href ? "hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-[0.99]" : "shadow-xs"}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <span className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-wider font-inter truncate">
          {label}
        </span>
        <div
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 shadow-xs ${style.iconBg}`}
        >
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="space-y-0.5 sm:space-y-1">
        <h3
          className={`text-xl sm:text-3xl font-bold font-poppins tracking-tight ${style.valueColor}`}
        >
          {value}
        </h3>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-slate-600 font-inter line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>

      {actionText && href && (
        <div className="mt-2.5 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-200/50 flex items-center justify-between text-[11px] sm:text-xs text-blood-600 hover:text-blood-700 font-medium">
          <span>{actionText}</span>
          <span>→</span>
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}
