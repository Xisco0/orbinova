import React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  className,
  hover = false,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm",
        hover && "transition-shadow duration-200 hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-4 border-b border-slate-100", className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <h3
      className={cn("font-poppins text-lg font-semibold text-dark leading-none tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <p
      className={cn("text-sm text-slate-500 font-inter", className)}
      {...props}
    >
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className={cn("pt-4", className)} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn("flex items-center pt-4 border-t border-slate-100 mt-4", className)}
      {...props}
    >
      {children}
    </div>
  );
};
