"use client";

import React, { useId } from "react";
import { TextareaFieldProps } from "@/types/ui";
import styles from "@/styles/component/textfield.module.css";

export const AjoNovaTextarea: React.FC<TextareaFieldProps> = ({
  id,
  name,
  label,
  value,
  defaultValue,
  placeholder = " ",
  className = "",
  readOnly = false,
  disabled = false,
  maxLength,
  required = false,
  issueText,
  error,
  helperText,
  rows = 4,
  onChange,
  onKeyDown,
  onKeyUp,
  onPaste,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorMessage = issueText || error;
  const cleanLabel = (label || "").replace(/\s*\*+$/, "");

  const textareaProps: any = {
    id: inputId,
    name,
    onChange,
    onKeyDown,
    onKeyUp,
    onPaste,
    readOnly,
    disabled,
    maxLength,
    required,
    rows,
    placeholder: placeholder || " ",
  };

  if (value !== undefined) {
    textareaProps.value = value;
    if (!onChange && !readOnly) {
      textareaProps.readOnly = true;
    }
  } else if (defaultValue !== undefined) {
    textareaProps.defaultValue = defaultValue;
  }

  return (
    <div className={styles.formGroup} id={`${inputId}_container`}>
      <textarea
        {...textareaProps}
        className={`${styles.floatingTextArea} ${
          errorMessage ? styles.inputError : ""
        } ${className}`}
      />
      {label && (
        <label htmlFor={inputId} className={styles.floatingLabel}>
          {cleanLabel} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {errorMessage && (
        <div className={styles.issueText} id={`issue_${inputId}`}>
          {errorMessage}
        </div>
      )}
      {!errorMessage && helperText && (
        <div className="text-xs text-slate-500 mt-1 pl-1">{helperText}</div>
      )}
    </div>
  );
};

export default AjoNovaTextarea;
