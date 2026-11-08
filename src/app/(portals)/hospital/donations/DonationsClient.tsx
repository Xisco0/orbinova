"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, PlusCircle, ArrowRight } from "lucide-react";
import { Donation } from "@/types/database";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Button, EmptyState } from "@/components/ui";
import { RecordDonationModal } from "@/components/hospital";

interface DonationsClientProps {
  donations: Donation[];
}

export function DonationsClient({ donations }: DonationsClientProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="flex justify-end pb-2">
        <Button
          variant="blood"
          size="sm"
          onClick={() => setShowModal(true)}
          className="text-xs"
          leftIcon={<PlusCircle className="w-3.5 h-3.5" />}
        >
          Record New Donation
        </Button>
      </div>

      {donations.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-7 h-7 text-blood-600" />}
          title="No Donations Recorded"
          description="Transfusions and physical blood collections recorded at your facility will appear here."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Donation Ref</TableHead>
                <TableHead>Donor ID</TableHead>
                <TableHead>Blood Group</TableHead>
                <TableHead>Units Contributed</TableHead>
                <TableHead>Collection Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs font-bold text-dark">
                    DON-{d.id.substring(0, 8).toUpperCase()}
                  </TableCell>

                  <TableCell className="font-mono text-xs text-slate-500">
                    DONOR-{d.donor_id.substring(0, 6).toUpperCase()}
                  </TableCell>

                  <TableCell>
                    <span className="px-2 py-0.5 rounded-md bg-blood-50 border border-blood-200 text-blood-700 font-bold text-xs">
                      {d.blood_group}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs font-bold text-dark font-inter">
                    {d.units_donated} Unit{d.units_donated > 1 ? "s" : ""}
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 font-inter">
                    {new Date(d.donation_date).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>

                  <TableCell>
                    <Badge variant="success" size="sm">
                      {d.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    <Link
                      href={`/hospital/donations/${d.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blood-600 hover:underline"
                    >
                      <span>View</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showModal && <RecordDonationModal onClose={() => setShowModal(false)} />}
    </>
  );
}
