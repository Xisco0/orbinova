"use client";

import React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./Button";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  const handlePage = (targetPage: number) => {
    if (onPageChange) {
      onPageChange(targetPage);
    } else {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      current.set("page", targetPage.toString());
      const qs = current.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2">
      {totalItems !== undefined && pageSize !== undefined && (
        <div className="text-xs text-slate-500 font-inter">
          Showing{" "}
          <span className="font-medium text-slate-700">
            {Math.min((currentPage - 1) * pageSize + 1, totalItems)}
          </span>{" "}
          to{" "}
          <span className="font-medium text-slate-700">
            {Math.min(currentPage * pageSize, totalItems)}
          </span>{" "}
          of <span className="font-medium text-slate-700">{totalItems}</span> results
        </div>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePage(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous Page"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          Previous
        </Button>

        <span className="text-xs font-medium text-slate-600 px-2">
          Page {currentPage} of {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next Page"
          rightIcon={<ChevronRight className="w-4 h-4" />}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
