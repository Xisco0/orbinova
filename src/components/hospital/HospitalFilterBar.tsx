"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, Filter, X } from "lucide-react";
import { SearchInput } from "@/components/ui";

interface FilterOption {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface HospitalFilterBarProps {
  filters: FilterOption[];
  searchPlaceholder?: string;
}

export function HospitalFilterBar({
  filters,
  searchPlaceholder = "Search records...",
}: HospitalFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");

  useEffect(() => {
    setSearchValue(searchParams.get("search") || "");
  }, [searchParams]);

  const handleFilterChange = (key: string, value: string) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (!value || value === "all") {
      current.delete(key);
    } else {
      current.set(key, value);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchValue(val);
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    if (!val) {
      current.delete("search");
    } else {
      current.set("search", val);
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const handleClearSearch = () => {
    setSearchValue("");
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.delete("search");
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  const hasActiveFilters = Array.from(searchParams.entries()).length > 0;

  const clearAllFilters = () => {
    router.push(pathname);
  };

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
      <div className="flex flex-col md:flex-row items-center gap-3">
        <div className="w-full md:flex-1">
          <SearchInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {filters.map((filter) => {
            const currentValue = searchParams.get(filter.key) || "all";
            return (
              <select
                key={filter.key}
                value={currentValue}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className="flex-1 min-w-[130px] sm:flex-initial sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 hover:bg-slate-100/80 transition-colors focus:outline-hidden focus:ring-2 focus:ring-secondary-500"
              >
                <option value="all">All {filter.label}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            );
          })}

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs text-blood-600 hover:text-blood-700 hover:bg-blood-50 rounded-xl transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
