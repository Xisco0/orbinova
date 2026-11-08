import React from "react";
import { PublicHeader, PublicFooter, ScrollToTop } from "@/components/public";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-inter text-slate-800 antialiased relative overflow-x-hidden w-full">
      <div id="top-of-page" className="absolute top-0 left-0 w-0 h-0 pointer-events-none" aria-hidden="true" />
      <PublicHeader />
      <main className="flex-1 w-full overflow-x-hidden pt-16 sm:pt-20">{children}</main>
      <PublicFooter />
      <ScrollToTop />
    </div>
  );
}
