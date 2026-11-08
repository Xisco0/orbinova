import React from "react";
import { TablePageSkeleton } from "@/components/ui";

export default function HospitalInventoryLoading() {
  return <TablePageSkeleton columns={5} rows={8} />;
}
