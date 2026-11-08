import React, { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm",
        secondary:
          "bg-secondary-700 text-white hover:bg-secondary-800 focus:ring-secondary-600 shadow-sm",
        accent:
          "bg-accent-600 text-white hover:bg-accent-700 focus:ring-accent-500 shadow-sm",
        blood:
          "bg-blood-600 text-white hover:bg-blood-700 focus:ring-blood-500 shadow-sm",
        danger:
          "bg-blood-600 text-white hover:bg-blood-700 focus:ring-blood-500 shadow-sm",
        outline:
          "border border-slate-300 bg-white text-dark hover:bg-slate-50 focus:ring-primary-500 shadow-sm",
        ghost:
          "text-dark hover:bg-slate-100 hover:text-dark focus:ring-slate-400",
        link:
          "text-primary-600 underline-offset-4 hover:underline p-0 h-auto font-normal focus:ring-0",
      },
      size: {
        sm: "h-8 px-3 text-xs gap-1.5",
        md: "h-10 px-4 text-sm gap-2",
        lg: "h-12 px-6 text-base gap-2.5",
        icon: "h-10 w-10 p-0",
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
