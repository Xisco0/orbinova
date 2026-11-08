import React from "react";
import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/constants/theme";

export interface LogoProps {
  variant?: "full" | "horizontal" | "icon" | "mark";
  size?: "sm" | "md" | "lg" | "xl";
  href?: string;
  className?: string;
  showTagline?: boolean;
  priority?: boolean;
  inverted?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = "horizontal",
  size = "md",
  href,
  className = "",
  showTagline = false,
  priority = false,
  inverted = false,
}) => {
  // Dimensions map
  const sizeMap = {
    sm: { iconSize: 32, textSize: "text-lg", tagSize: "text-[10px]", height: 32 },
    md: { iconSize: 42, textSize: "text-xl", tagSize: "text-[11px]", height: 42 },
    lg: { iconSize: 52, textSize: "text-2xl", tagSize: "text-xs", height: 54 },
    xl: { iconSize: 68, textSize: "text-3xl", tagSize: "text-sm", height: 70 },
  };

  const { iconSize, textSize, tagSize } = sizeMap[size];

  const content = (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Visual Logo Mark / Official Asset */}
      <div
        className={`relative overflow-hidden rounded-xl shrink-0 flex items-center justify-center bg-white shadow-xs border ${
          inverted ? "border-slate-700 shadow-md" : "border-slate-200/70"
        }`}
        style={{ width: iconSize, height: iconSize }}
      >
        <Image
          src="/images/orbinova-logo.png"
          alt={BRAND.name}
          width={iconSize}
          height={iconSize}
          className="object-contain w-full h-full p-1 rounded-lg"
          priority={priority}
        />
      </div>

      {variant !== "icon" && (
        <div className="flex flex-col justify-center leading-tight">
          <div className="flex items-center tracking-tight">
            <span
              className={`font-poppins font-extrabold ${
                inverted ? "text-white" : "text-slate-900"
              } ${textSize}`}
            >
              ORBI
            </span>
            <span
              className={`font-poppins font-extrabold ${
                inverted ? "text-primary-400" : "text-primary-600"
              } ${textSize}`}
            >
              NOVA
            </span>
          </div>
          {showTagline || variant === "full" ? (
            <span
              className={`font-inter font-medium uppercase tracking-wider ${
                inverted ? "text-slate-400" : "text-slate-500"
              } ${tagSize}`}
            >
              {BRAND.tagline}
            </span>
          ) : (
            <span
              className={`font-inter font-semibold tracking-wide ${
                inverted ? "text-teal-400" : "text-secondary-700"
              } ${tagSize}`}
            >
              Healthcare Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-lg"
      >
        {content}
      </Link>
    );
  }

  return content;
};

export default Logo;
