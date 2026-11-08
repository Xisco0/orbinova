import React from "react";
import { TablePageSkeleton } from "@/components/ui";

export default function AdminInventoryLoading() {
  return <TablePageSkeleton columns={5} rows={8} />;
}
