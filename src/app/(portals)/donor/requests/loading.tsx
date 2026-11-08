import React from "react";
import { SkeletonList, SkeletonHeading, SkeletonText } from "@/components/ui";

export default function DonorRequestsLoading() {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="space-y-2 pb-2 border-b border-slate-200/60">
        <SkeletonHeading className="w-52 h-8" />
        <SkeletonText className="w-72 max-w-full h-4" />
      </div>
      <SkeletonList items={4} />
    </div>
  );
}
