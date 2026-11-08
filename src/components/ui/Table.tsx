import React from "react";
import { cn } from "@/lib/utils";

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <table
        className={cn("w-full text-left text-sm text-slate-600 font-inter", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ className, children, ...props }) => {
  return (
    <thead
      className={cn("bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-700", className)}
      {...props}
    >
      {children}
    </thead>
  );
};

export const TableBody: React.FC<
  React.HTMLAttributes<HTMLTableSectionElement>
> = ({ className, children, ...props }) => {
  return (
    <tbody
      className={cn("divide-y divide-slate-100 bg-white", className)}
      {...props}
    >
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-slate-50/70",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<
  React.ThHTMLAttributes<HTMLTableCellElement>
> = ({ className, children, ...props }) => {
  return (
    <th className={cn("px-4 py-3.5 text-slate-800", className)} {...props}>
      {children}
    </th>
  );
};

export const TableCell: React.FC<
  React.TdHTMLAttributes<HTMLTableCellElement>
> = ({ className, children, ...props }) => {
  return (
    <td className={cn("px-4 py-3.5 text-slate-700 align-middle", className)} {...props}>
      {children}
    </td>
  );
};
