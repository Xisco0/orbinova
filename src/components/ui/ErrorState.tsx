import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message = "We encountered an unexpected error while loading this information. Please try again.",
  onRetry,
  retryText = "Try Again",
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-blood-200 bg-blood-50/40 space-y-4",
        className
      )}
      role="alert"
    >
      <div className="w-12 h-12 rounded-full bg-blood-100 text-blood-600 flex items-center justify-center">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="font-poppins text-base font-semibold text-blood-900">
          {title}
        </h4>
        <p className="text-xs sm:text-sm text-blood-700/90 font-inter">
          {message}
        </p>
      </div>
      {onRetry && (
        <Button
          variant="blood"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          {retryText}
        </Button>
      )}
    </div>
  );
};
