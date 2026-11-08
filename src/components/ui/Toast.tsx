"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4500) => {
      // Prevent duplicate toasts with the exact same content within the active list
      setToasts((prev) => {
        const isDuplicate = prev.some(
          (t) => t.type === type && t.title === title && t.message === message
        );
        if (isDuplicate) return prev;

        const id = Math.random().toString(36).substring(2, 9);

        if (duration > 0) {
          setTimeout(() => {
            removeToast(id);
          }, duration);
        }

        // Keep maximum of 4 active toasts to avoid overwhelming screen
        const nextList = [...prev, { id, type, title, message, duration }];
        return nextList.slice(-4);
      });
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => showToast("success", title, message),
    [showToast]
  );
  const error = useCallback(
    (title: string, message?: string) => showToast("error", title, message),
    [showToast]
  );
  const warning = useCallback(
    (title: string, message?: string) => showToast("warning", title, message),
    [showToast]
  );
  const info = useCallback(
    (title: string, message?: string) => showToast("info", title, message),
    [showToast]
  );

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-blood-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    info: <Info className="w-5 h-5 text-primary-600 shrink-0" />,
  };

  const styleMap: Record<ToastType, string> = {
    success: "border-green-200 bg-green-50/90 text-green-900",
    error: "border-blood-200 bg-blood-50/95 text-blood-900",
    warning: "border-amber-200 bg-amber-50/95 text-amber-900",
    info: "border-primary-200 bg-primary-50/95 text-primary-900",
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm transition-all transform animate-slideUp",
              styleMap[toast.type]
            )}
          >
            {iconMap[toast.type]}
            <div className="flex-1 space-y-0.5">
              <h5 className="text-sm font-semibold font-poppins">{toast.title}</h5>
              {toast.message && (
                <p className="text-xs font-inter opacity-90">{toast.message}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="p-0.5 opacity-60 hover:opacity-100 rounded focus:outline-none"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
