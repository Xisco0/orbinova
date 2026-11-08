import React from "react";
import { TablePageSkeleton } from "@/components/ui";

export default function HospitalMembersLoading() {
  return <TablePageSkeleton columns={4} rows={6} />;
}
