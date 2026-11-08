"use client";

import React, { useState } from "react";
import { Droplet, Plus, Minus, AlertCircle, CheckCircle2 } from "lucide-react";
import { BloodInventory, BloodGroupCode } from "@/types/database";
import { Button } from "@/components/ui";
import { InventoryAdjustModal } from "./InventoryAdjustModal";

interface InventoryCardProps {
  item: BloodInventory;
  canManage?: boolean;
}

export function InventoryCard({ item, canManage = false }: InventoryCardProps) {
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  const available = item.available_quantity || 0;
  const reserved = item.reserved_quantity || 0;
  const total = item.quantity || 0;

  // Status computation: Healthy >= 10, Low 3-9, Critical 1-2, Out of stock = 0
  let statusBadge = {
    label: "Healthy Stock",
    bg: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  };

  if (available === 0) {
    statusBadge = {
      label: "Out of Stock",
      bg: "bg-slate-100 text-slate-700 border-slate-300",
      dot: "bg-slate-400",
    };
  } else if (available < 3) {
    statusBadge = {
      label: "Critical Shortage",
      bg: "bg-red-50 text-red-700 border-red-200 animate-pulse",
      dot: "bg-red-500",
    };
  } else if (available < 10) {
    statusBadge = {
      label: "Low Stock",
      bg: "bg-amber-50 text-amber-700 border-amber-200",
      dot: "bg-amber-500",
    };
  }

  return (
    <>
      <div className="p-4 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-3.5 sm:space-y-4">
        {/* Top: Blood Group & Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blood-600 text-white font-poppins font-bold text-sm sm:text-base flex items-center justify-center shadow-xs shrink-0">
              {item.blood_group}
            </div>
            <div className="min-w-0">
              <h4 className="font-poppins font-bold text-xs sm:text-sm text-dark truncate">
                Group {item.blood_group}
              </h4>
              <span className="text-[9px] sm:text-[10px] text-slate-400 uppercase tracking-wider block">
                Whole Blood
              </span>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs border shrink-0 font-medium whitespace-nowrap ${statusBadge.bg}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusBadge.dot}`} />
            <span>{statusBadge.label}</span>
          </div>
        </div>

        {/* Quantities breakdown */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center font-inter">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Available
            </span>
            <span className="text-lg font-bold text-dark font-poppins">
              {available}
            </span>
          </div>

          <div className="border-x border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Reserved
            </span>
            <span className="text-lg font-bold text-amber-600 font-poppins">
              {reserved}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
              Total Units
            </span>
            <span className="text-lg font-bold text-slate-700 font-poppins">
              {total}
            </span>
          </div>
        </div>

        {/* Action button */}
        {canManage && (
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => setShowAdjustModal(true)}
            className="text-xs text-slate-700"
          >
            Adjust Stock
          </Button>
        )}
      </div>

      {showAdjustModal && (
        <InventoryAdjustModal
          bloodGroup={item.blood_group}
          currentQuantity={total}
          currentReserved={reserved}
          onClose={() => setShowAdjustModal(false)}
        />
      )}
    </>
  );
}
