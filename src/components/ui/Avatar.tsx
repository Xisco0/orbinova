import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = "User avatar",
  name,
  size = "md",
  className,
}) => {
  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  const getInitials = (str?: string) => {
    if (!str) return "SD";
    const parts = str.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-primary-100 text-primary-800 font-semibold border border-primary-200 select-none shrink-0",
        sizeMap[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="64px"
          className="object-cover"
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
};
