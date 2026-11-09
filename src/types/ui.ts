import { ChangeEvent, KeyboardEvent, ReactNode } from "react";

export interface TextFieldProps {
  id?: string;
  name?: string;
  type?: string;
  label?: string;
  value?: string | number;
  defaultValue?: string | number;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url" | string;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  required?: boolean;
  issueText?: string;
  error?: string;
  helperText?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyUp?: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

export interface TextareaFieldProps extends Omit<TextFieldProps, "onChange" | "type"> {
  rows?: number;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}
