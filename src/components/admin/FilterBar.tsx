"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterSelect {
  name: string;
  label: string;
  value?: string;
  options: FilterOption[];
  onChange?: (val: string) => void;
}

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: () => void;
  selects?: FilterSelect[];
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = "Search records...",
  searchValue: controlledSearchValue,
  onSearchChange,
  onSearchSubmit,
  selects = [],
  onClearFilters,
  hasActiveFilters: controlledHasActiveFilters,
  className = "",
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isUrlMode = !onSearchChange;

  const [localSearch, setLocalSearch] = useState(
    controlledSearchValue ?? (isUrlMode ? searchParams.get("search") || "" : "")
  );

  useEffect(() => {
    if (controlledSearchValue !== undefined) {
      setLocalSearch(controlledSearchValue);
    } else if (isUrlMode) {
      setLocalSearch(searchParams.get("search") || "");
    }
  }, [controlledSearchValue, isUrlMode, searchParams]);

  const handleSearchInput = (val: string) => {
    setLocalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (!val) {
        current.delete("search");
      } else {
        current.set("search", val);
      }
      current.delete("page"); // Reset to page 1 on new search
      const qs = current.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    }
  };

  const handleSelectChange = (name: string, val: string, customOnChange?: (v: string) => void) => {
    if (customOnChange) {
      customOnChange(val);
    } else {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      if (!val || val === "all") {
        current.delete(name);
      } else {
        current.set(name, val);
      }
      current.delete("page");
      const qs = current.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`);
    }
  };

  const handleClear = () => {
    if (onClearFilters) {
      onClearFilters();
    } else {
      setLocalSearch("");
      router.push(pathname);
    }
  };

  const hasActive =
    controlledHasActiveFilters !== undefined
      ? controlledHasActiveFilters
      : Array.from(searchParams.entries()).length > 0;

  return (
    <div
      className={`bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 ${className}`}
    >
      {/* Search Input */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="search"
          placeholder={searchPlaceholder}
          value={localSearch}
          onChange={(e) => handleSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearchSubmit?.()}
          className="block w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
        {localSearch && (
          <button
            type="button"
            onClick={() => handleSearchInput("")}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Select Filters & Clear */}
      <div className="flex flex-wrap items-center gap-2">
        {selects.map((select) => {
          const currentValue =
            select.value !== undefined
              ? select.value
              : searchParams.get(select.name) || "all";

          return (
            <div key={select.name} className="flex-1 sm:flex-initial">
              <select
                value={currentValue}
                onChange={(e) => handleSelectChange(select.name, e.target.value, select.onChange)}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                aria-label={select.label}
              >
                {select.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}

        {hasActive && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-slate-500 hover:text-blood-600 text-xs gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset</span>
          </Button>
        )}
      </div>
    </div>
  );
};
