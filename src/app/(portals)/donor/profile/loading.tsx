import React from "react";
import { SkeletonCard, SkeletonHeading, SkeletonText } from "@/components/ui";

export default function DonorProfileLoading() {
  return (
    <div className="space-y-6 max-w-4xl animate-fadeIn">
      <div className="space-y-2 pb-2 border-b border-slate-200/60">
        <SkeletonHeading className="w-48 h-8" />
        <SkeletonText className="w-64 max-w-full h-4" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <SkeletonCard />
        </div>
        <div className="md:col-span-2 space-y-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
