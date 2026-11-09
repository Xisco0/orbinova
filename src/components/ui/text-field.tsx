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
  min,
  max,
  step,
  issueText,
  error,
  helperText,
  onChange,
  onBlur,
  onFocus,
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
    onBlur,
    onFocus,
    onKeyDown,
    onKeyUp,
    onPaste,
    readOnly,
    disabled,
    maxLength,
    min,
    max,
    step,
    required,
    placeholder: " ",
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
    <div className={`w-full ${className}`} id={`${inputId}_container`}>
      <div className={styles.formGroup}>
        {isTextArea ? (
          <textarea
            {...inputProps}
            className={`${styles.floatingTextArea} ${
              errorMessage ? styles.inputError : ""
            }`}
          />
        ) : (
          <input
            {...inputProps}
            type={type}
            inputMode={inputMode as any}
            autoComplete={autoComplete}
            className={`${styles.floatingInput} ${
              errorMessage ? styles.inputError : ""
            }`}
          />
        )}

        {/* Floating Label */}
        {label && (
          <label htmlFor={inputId} className={styles.floatingLabel}>
            {cleanLabel} {required && <span className="text-red-500">*</span>}
          </label>
        )}
      </div>

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
