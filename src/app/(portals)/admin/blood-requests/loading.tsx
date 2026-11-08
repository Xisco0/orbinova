import React from "react";
import { TablePageSkeleton } from "@/components/ui";

export default function AdminBloodRequestsLoading() {
  return <TablePageSkeleton columns={6} rows={6} />;
}
