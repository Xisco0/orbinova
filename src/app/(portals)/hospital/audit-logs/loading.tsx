import React from "react";
import { Card } from "@/components/ui";

export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 bg-slate-200 rounded-xl w-72" />
      <div className="h-4 bg-slate-100 rounded-lg w-96" />

      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-100 rounded-2xl" />
        ))}
      </div>

      {/* Filter Skeleton */}
      <div className="h-14 bg-slate-100 rounded-2xl" />

      {/* Table Skeleton */}
      <Card className="p-6 space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-50 rounded-xl" />
        ))}
      </Card>
    </div>
  );
}
