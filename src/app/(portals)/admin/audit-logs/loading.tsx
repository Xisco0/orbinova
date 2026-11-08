import React from "react";
import { TablePageSkeleton } from "@/components/ui";

export default function AdminAuditLogsLoading() {
  return <TablePageSkeleton columns={5} rows={8} />;
}
