"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle, Info, CheckCircle2, AlertCircle } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  isLoading = false,
}) => {
  const iconMap = {
    danger: (
      <div className="w-12 h-12 rounded-full bg-blood-100 text-blood-600 flex items-center justify-center shrink-0">
        <AlertCircle className="w-6 h-6" />
      </div>
    ),
    warning: (
      <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-6 h-6" />
      </div>
    ),
    primary: (
      <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
        <Info className="w-6 h-6" />
      </div>
    ),
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center space-y-4">
        {iconMap[variant]}
        <div className="space-y-2">
          <h4 className="font-poppins text-lg font-semibold text-dark">
            {title}
          </h4>
          <p className="text-sm text-slate-600 font-inter max-w-sm">
            {message}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "danger" ? "blood" : variant === "warning" ? "secondary" : "primary"}
            onClick={onConfirm}
            isLoading={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
