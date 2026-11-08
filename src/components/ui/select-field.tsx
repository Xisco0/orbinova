"use client";

import React, { useState, useRef, useEffect, useId } from "react";
import styles from "@/styles/component/selectfield.module.css";
import { ChevronDown, X } from "lucide-react";
import { SelectOption } from "./Select";

export type { SelectOption as SelectFieldOption };

export interface SelectFieldProps {
  id?: string;
  label: string;
  options: SelectOption[];
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  issueText?: string;
  error?: string;
  helperText?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  options = [],
  value = "",
  onChange,
  disabled = false,
  required = false,
  className = "",
  issueText,
  error,
  helperText,
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const errorMessage = issueText || error;

  const selected = options.find((opt) => String(opt.value) === String(value));
  const isFloating = open || Boolean(value);

  // Clean trailing asterisks so double asterisks never happen
  const cleanLabel = (label || "").replace(/\s*\*+$/, "");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    if (disabled) return;
    if (onChange) {
      onChange({ target: { value: val } });
    }
    setOpen(false);
  };

  return (
    <div className={styles.formGroup} ref={containerRef} id={`${selectId}_container`}>
      <div
        id={selectId}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!disabled) setOpen((prev) => !prev);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={`${styles.inputBox} ${open ? styles.inputBoxOpen : ""} ${
          errorMessage ? styles.errorBorder : ""
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
        onClick={() => {
          if (disabled) return;
          setOpen((prev) => !prev);
        }}
      >
        {/* Floating Label */}
        <span className={`${styles.floatingLabel} ${isFloating ? styles.activeLabel : ""}`}>
          {cleanLabel} {required && <span className="text-red-500">*</span>}
        </span>

        {/* Display Value Area */}
        <div className={styles.contentArea}>
          <span className={styles.selectedValue}>
            {selected ? selected.label : ""}
          </span>
        </div>

        {/* Dropdown Toggle Icon */}
        <span className={styles.arrowIcon}>
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 ${open ? "rotate-180 text-blue-600" : ""}`}
          />
        </span>
      </div>

      {/* Dropdown Menu */}
      {open && (
        <div className={styles.dropdown} role="listbox">
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isSelected ? styles.selectedOption : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelect(opt.value);
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}

      {/* Validation Issue / Error Text */}
      {errorMessage && (
        <div className={styles.issueText} id={`issue_${selectId}`}>
          {errorMessage}
        </div>
      )}

      {/* Helper text if no error */}
      {!errorMessage && helperText && (
        <div className="text-xs text-slate-500 mt-1 pl-1">{helperText}</div>
      )}
    </div>
  );
};

export default SelectField;
