import React from "react";
import { DashboardSkeleton } from "@/components/ui";

export default function DonorLoading() {
  return <DashboardSkeleton statCount={3} showTable={false} />;
}
