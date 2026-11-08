import React from "react";
import { TablePageSkeleton } from "@/components/ui";

export default function DonorDonationsLoading() {
  return <TablePageSkeleton columns={5} rows={5} />;
}
