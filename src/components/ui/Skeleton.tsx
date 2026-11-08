import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200/80", className)}
      {...props}
    />
  );
}

export function SkeletonHeading({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton className={cn("h-7 w-48 rounded-lg", className)} {...props} />
  );
}

export function SkeletonText({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton className={cn("h-4 w-full rounded-md", className)} {...props} />
  );
}

export function SkeletonAvatar({
  size = "md",
  className,
  ...props
}: SkeletonProps & { size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };
  return (
    <Skeleton
      className={cn("rounded-full shrink-0", sizeClasses[size], className)}
      {...props}
    />
  );
}

export function SkeletonButton({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton className={cn("h-9 w-24 rounded-xl", className)} {...props} />
  );
}

export function SkeletonBadge({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton className={cn("h-5 w-16 rounded-full", className)} {...props} />
  );
}

export function SkeletonStatCard({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="w-9 h-9 rounded-xl" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-20 rounded-lg" />
        <Skeleton className="h-3 w-36 rounded-md" />
      </div>
    </div>
  );
}

export function SkeletonCard({
  className,
  children,
}: SkeletonProps & { children?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4",
        className
      )}
    >
      {children || (
        <>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-4 w-16 rounded-md" />
          </div>
          <div className="space-y-3 pt-1">
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-4/5 rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
        </>
      )}
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 5,
  className,
}: SkeletonProps & { rows?: number; columns?: number }) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden",
        className
      )}
    >
      {/* Table Header Skeleton */}
      <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200/80 flex items-center justify-between gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`th-${i}`}
            className={cn(
              "h-4 rounded-md",
              i === 0 ? "w-32" : i === columns - 1 ? "w-20" : "w-24"
            )}
          />
        ))}
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={`tr-${rIdx}`}
            className="px-6 py-4 flex items-center justify-between gap-4"
          >
            {Array.from({ length: columns }).map((_, cIdx) => (
              <div
                key={`td-${rIdx}-${cIdx}`}
                className={cn(
                  "flex items-center gap-3",
                  cIdx === 0 ? "w-36" : cIdx === columns - 1 ? "w-20" : "w-24"
                )}
              >
                {cIdx === 0 && <SkeletonAvatar size="sm" />}
                <Skeleton
                  className={cn(
                    "h-3.5 rounded-md",
                    cIdx === 0 ? "w-24" : "w-full"
                  )}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({
  items = 4,
  className,
}: SkeletonProps & { items?: number }) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden",
        className
      )}
    >
      {Array.from({ length: items }).map((_, idx) => (
        <div
          key={idx}
          className="p-4 sm:p-5 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <SkeletonAvatar size="md" />
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-44 rounded-md" />
              <Skeleton className="h-3 w-64 max-w-full rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SkeletonBadge />
            <SkeletonButton className="w-16 h-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton({
  statCount = 4,
  showTable = true,
}: {
  statCount?: number;
  showTable?: boolean;
}) {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div className="space-y-2">
          <SkeletonHeading className="w-56 h-8" />
          <SkeletonText className="w-72 max-w-full h-4" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonButton className="w-28 h-10" />
          <SkeletonButton className="w-32 h-10" />
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div
        className={cn(
          "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6",
          statCount === 4
            ? "lg:grid-cols-4"
            : statCount === 3
            ? "lg:grid-cols-3"
            : "lg:grid-cols-4"
        )}
      >
        {Array.from({ length: statCount }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {showTable ? (
            <SkeletonTable rows={5} columns={4} />
          ) : (
            <SkeletonList items={4} />
          )}
        </div>
        <div className="space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export function TablePageSkeleton({
  title = "Records",
  columns = 5,
  rows = 6,
}: {
  title?: string;
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div className="space-y-2">
          <SkeletonHeading className="w-48 h-8" />
          <SkeletonText className="w-64 max-w-full h-4" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonButton className="w-32 h-10" />
        </div>
      </div>

      {/* Search & Filter Bar Skeleton */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Skeleton className="h-10 w-full sm:w-80 rounded-xl" />
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Data Table Skeleton */}
      <SkeletonTable rows={rows} columns={columns} />

      {/* Pagination Skeleton */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-4 w-36 rounded-md" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

