"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ExternalLink, AlertCircle, ChevronRight, X, Droplet, ScanLine, ArrowRight } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/Button";
import { ORBINOVA_MODULES, ExternalModuleConfig } from "@/config/modules";
import { cn } from "@/lib/utils";

interface ModuleAccessButtonProps {
  module: "donor" | "imaging";
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  showIcon?: boolean;
  label?: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const ModuleAccessButton: React.FC<ModuleAccessButtonProps> = ({
  module,
  variant,
  size = "md",
  className,
  showIcon = true,
  label,
  subtitle,
  leftIcon,
  fullWidth = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const config: ExternalModuleConfig = ORBINOVA_MODULES[module];
  const defaultLabel = module === "donor" ? "Access ORBINOVA Donor" : "Access ORBINOVA Imaging";
  const buttonLabel = label || defaultLabel;
  const isInternal = Boolean(config.url?.startsWith("/"));

  const defaultSub =
    module === "donor"
      ? "Donor Matching & Blood Management"
      : "AI Medical Imaging & Diagnostic Support";
  const displaySubtitle = subtitle;

  const defaultIcon =
    module === "donor" ? (
      <Droplet className="w-5 h-5 text-white fill-white/20 shrink-0" />
    ) : (
      <ScanLine className="w-5 h-5 text-white shrink-0" />
    );
  const leadingIcon = leftIcon !== undefined ? leftIcon : defaultIcon;

  // Rich dual-line button rendering when subtitle is requested
  if (subtitle !== undefined) {
    const isDonor = module === "donor";
    const bgStyles = isDonor
      ? "bg-blood-600 hover:bg-blood-700 text-white shadow-md shadow-blood-600/20 focus:ring-blood-500"
      : "bg-teal-700 hover:bg-teal-800 text-white shadow-md shadow-teal-700/20 focus:ring-teal-500";

    const wrapperClasses = cn(
      className?.includes("w-full") ? "w-full" : "inline-block",
      className?.includes("sm:w-auto") && "sm:w-auto",
      fullWidth && "w-full"
    );

    const buttonContent = (
      <div
        className={cn(
          "flex items-center gap-3.5 px-5 py-3 rounded-2xl transition-all duration-200 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 w-full",
          bgStyles,
          className
        )}
      >
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          {leadingIcon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-poppins font-bold text-sm tracking-tight leading-snug">
            <span>{buttonLabel}</span>
            <ArrowRight className="w-4 h-4 opacity-90 shrink-0 inline-block ml-0.5" />
          </div>
          <div className="text-[11px] font-inter text-white/80 font-normal leading-tight truncate">
            {displaySubtitle || defaultSub}
          </div>
        </div>
      </div>
    );

    if (config.url) {
      if (isInternal) {
        return (
          <Link href={config.url} className={wrapperClasses}>
            {buttonContent}
          </Link>
        );
      }
      return (
        <a
          href={config.url}
          target="_blank"
          rel="noopener noreferrer"
          className={wrapperClasses}
          aria-label={`${buttonLabel} (${displaySubtitle || defaultSub}) opens in new tab`}
        >
          {buttonContent}
        </a>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={wrapperClasses}
      >
        {buttonContent}
      </button>
    );
  }

  // Standard Button rendering
  const chosenVariant = variant || (module === "donor" ? "blood" : "secondary");

    const wrapperClasses = cn(
      className?.includes("w-full") ? "w-full" : "inline-block",
      className?.includes("sm:w-auto") && "sm:w-auto",
      fullWidth && "w-full"
    );

  const buttonElement = (
    <Button
      variant={chosenVariant}
      size={size}
      fullWidth={fullWidth || className?.includes("w-full")}
      className={cn("font-semibold shadow-xs transition-all", className)}
      rightIcon={
        showIcon ? (
          isInternal ? (
            <ChevronRight className="w-4 h-4 ml-1 opacity-80" />
          ) : (
            <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
          )
        ) : undefined
      }
    >
      {buttonLabel}
    </Button>
  );

  return (
    <>
      {config.url ? (
        isInternal ? (
          <Link
            href={config.url}
            className={wrapperClasses}
            aria-label={buttonLabel}
          >
            {buttonElement}
          </Link>
        ) : (
          <a
            href={config.url}
            target="_blank"
            rel="noopener noreferrer"
            className={wrapperClasses}
            aria-label={`${buttonLabel} (opens external application in a new tab)`}
          >
            {buttonElement}
          </a>
        )
      ) : (
        <Button
          variant={chosenVariant}
          size={size}
          fullWidth={fullWidth}
          onClick={() => setModalOpen(true)}
          className={cn("font-semibold shadow-xs opacity-90", className)}
          rightIcon={
            showIcon ? <ChevronRight className="w-4 h-4 ml-1 opacity-70" /> : undefined
          }
        >
          {buttonLabel}
        </Button>
      )}

      {/* Helpful Fallback Modal when URL is unconfigured */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="module-fallback-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 text-amber-600">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <h4
                  id="module-fallback-title"
                  className="font-poppins font-bold text-base text-slate-900"
                >
                  {config.name} Deployment Notice
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 font-inter leading-relaxed">
              The independent <strong>{config.name}</strong> development team has not yet deployed or
              configured the production URL for this module.
            </p>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs font-mono text-slate-700 space-y-1">
              <div className="text-[11px] font-sans font-medium text-slate-500">
                Environment Variable to Configure:
              </div>
              <div className="font-bold text-primary-700">{config.envVar}</div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
