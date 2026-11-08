import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none whitespace-nowrap shrink-0",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-800 border border-slate-200",
        primary: "bg-primary-50 text-primary-700 border border-primary-200",
        secondary: "bg-secondary-50 text-secondary-700 border border-secondary-200",
        accent: "bg-accent-50 text-accent-700 border border-accent-200",
        success: "bg-green-50 text-green-700 border border-green-200",
        warning: "bg-amber-50 text-amber-800 border border-amber-200",
        blood: "bg-blood-50 text-blood-700 border border-blood-200",
        emergency: "bg-blood-100 text-blood-800 border border-blood-300 animate-pulse",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        md: "px-2.5 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant,
  size,
  icon,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
