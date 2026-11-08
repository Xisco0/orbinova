"use client";

import React, { useId } from "react";
import { TextFieldProps } from "@/types/ui";
import styles from "@/styles/component/textfield.module.css";

export const TextField: React.FC<TextFieldProps> = ({
  id,
  name,
  type = "text",
  value,
  defaultValue,
  label,
  placeholder = " ",
  className = "",
  readOnly = false,
  disabled = false,
  autoComplete = "off",
  onPaste,
  inputMode,
  maxLength,
  issueText,
  error,
  helperText,
  onChange,
  onKeyDown,
  onKeyUp,
  required = false,
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const isTextArea = type === "textarea";
  const errorMessage = issueText || error;
  const cleanLabel = (label || "").replace(/\s*\*+$/, "");

  const inputProps: any = {
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
    placeholder: placeholder || " ",
  };

  if (value !== undefined) {
    inputProps.value = value;
    if (!onChange && !readOnly) {
      inputProps.readOnly = true;
    }
  } else if (defaultValue !== undefined) {
    inputProps.defaultValue = defaultValue;
  }

  return (
    <div className={styles.formGroup} id={`${inputId}_container`}>
      {isTextArea ? (
        <textarea
          {...inputProps}
          className={`${styles.floatingTextArea} ${
            errorMessage ? styles.inputError : ""
          } ${className}`}
        />
      ) : (
        <input
          {...inputProps}
          type={type}
          inputMode={inputMode as any}
          autoComplete={autoComplete}
          className={`${styles.floatingInput} ${
            errorMessage ? styles.inputError : ""
          } ${className}`}
        />
      )}

      {/* Floating Label */}
      {label && (
        <label htmlFor={inputId} className={styles.floatingLabel}>
          {cleanLabel} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Validation Issue / Error Text */}
      {errorMessage && (
        <div className={styles.issueText} id={`issue_${inputId}`}>
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

export default TextField;
