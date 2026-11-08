import React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 space-y-4",
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
        {icon || <FolderOpen className="w-7 h-7 text-slate-400" />}
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h4 className="font-poppins text-base font-semibold text-dark">
          {title}
        </h4>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 font-inter">
            {description}
          </p>
        )}
      </div>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};
