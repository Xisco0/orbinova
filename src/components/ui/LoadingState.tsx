import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  message?: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  description,
  size = "md",
  className,
}) => {
  const sizeMap = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center space-y-3",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2
        className={cn("animate-spin text-primary-600", sizeMap[size])}
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-800 font-inter">
          {message}
        </p>
        {description && (
          <p className="text-xs text-slate-500 font-inter max-w-xs">
            {description}
          </p>
        )}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
};
