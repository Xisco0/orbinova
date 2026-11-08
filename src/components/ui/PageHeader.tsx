import React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  badge,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col gap-3.5 sm:gap-4 md:flex-row md:items-center md:justify-between pb-4 sm:pb-6 border-b border-slate-200/80 mb-4 sm:mb-6",
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
          <h1 className="font-poppins text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-dark break-words">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="font-inter text-xs sm:text-sm md:text-base text-slate-500 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 shrink-0 w-full md:w-auto">
          {action}
        </div>
      )}
    </div>
  );
};
