import React from "react";

export default function DonorAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center">
      {children}
    </div>
  );
}
