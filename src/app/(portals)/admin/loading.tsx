import React from "react";
import { DashboardSkeleton } from "@/components/ui";

export default function AdminLoading() {
  return <DashboardSkeleton statCount={4} showTable={true} />;
}
