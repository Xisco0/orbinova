import React, { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  options?: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      options = [],
      placeholder,
      id,
      disabled,
      required,
      children,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-slate-700"
          >
            {label}
            {required && <span className="text-blood-600 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={cn(
              "block w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-10 text-sm text-slate-900 transition-colors focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
              error &&
                "border-blood-500 focus:border-blood-500 focus:ring-blood-500/20",
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.length > 0
              ? options.map((opt) => (
                  <option
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && (
          <p id={errorId} className="text-xs text-blood-600 font-medium animate-fadeIn">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={helperId} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
