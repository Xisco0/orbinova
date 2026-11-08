"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  User,
  Droplet,
  ScanLine,
  Home,
  Info,
  PhoneCall,
  Building2,
  Layers,
  HelpCircle,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";

export const PublicHeader: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setSolutionsOpen(false);
  }, [pathname]);

  // Lock body scroll and allow Escape to close mobile menu
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileMenuOpen(false);
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    } else {
      document.body.style.overflow = "";
    }
  }, [mobileMenuOpen]);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 w-full transition-all duration-200 bg-white/95 backdrop-blur-md",
        isScrolled ? "border-b border-slate-200 shadow-xs" : "border-b border-slate-100"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Brand Logo */}
          <div className="shrink-0">
            <Logo variant="horizontal" size="md" href="/" priority />
          </div>

          {/* Clean, Focused Desktop Navigation (Home, Solutions, About, Contact) */}
          <nav
            aria-label="Main Navigation"
            className="hidden md:flex items-center gap-1 sm:gap-2 font-inter text-sm font-medium text-slate-700"
          >
            <Link
              href="/"
              className={cn(
                "px-4 py-2 rounded-full transition-colors",
                pathname === "/"
                  ? "bg-primary-50 text-primary-600 font-semibold"
                  : "hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              Home
            </Link>

            {/* Solutions Dropdown */}
            <div className="relative group">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-1 px-4 py-2 rounded-full transition-colors",
                  pathname.startsWith("/#solutions") || solutionsOpen
                    ? "text-primary-600 font-semibold"
                    : "hover:text-slate-900 hover:bg-slate-50"
                )}
                onClick={() => setSolutionsOpen(!solutionsOpen)}
                onMouseEnter={() => setSolutionsOpen(true)}
              >
                <span>Solutions</span>
                <ChevronDown className="w-4 h-4 opacity-70 group-hover:rotate-180 transition-transform" />
              </button>

              {solutionsOpen && (
                <div
                  onMouseLeave={() => setSolutionsOpen(false)}
                  className="absolute left-0 mt-1 w-64 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <Link
                    href="/#solutions"
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blood-50 text-blood-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Droplet className="w-4 h-4 fill-blood-600" />
                    </div>
                    <div>
                      <div className="font-poppins font-bold text-xs text-slate-900">
                        ORBINOVA Donor
                      </div>
                      <div className="text-[11px] text-slate-500 leading-snug">
                        Donor coordination & blood matching
                      </div>
                    </div>
                  </Link>
                  <Link
                    href="/#solutions"
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ScanLine className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-poppins font-bold text-xs text-slate-900">
                        ORBINOVA Imaging
                      </div>
                      <div className="text-[11px] text-slate-500 leading-snug">
                        AI medical imaging & diagnostic support
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/about"
              className={cn(
                "px-4 py-2 rounded-full transition-colors",
                pathname === "/about"
                  ? "bg-primary-50 text-primary-600 font-semibold"
                  : "hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              About
            </Link>

            <Link
              href="/contact"
              className={cn(
                "px-4 py-2 rounded-full transition-colors",
                pathname === "/contact"
                  ? "bg-primary-50 text-primary-600 font-semibold"
                  : "hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              Contact
            </Link>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Sign In Button */}
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl border border-primary-500 text-primary-600 hover:bg-primary-50 text-xs sm:text-sm font-semibold font-inter transition-colors flex items-center gap-1.5"
            >
              <User className="w-4 h-4 text-primary-600" />
              <span>Sign In</span>
            </Link>

            {/* Become a Donor Red Button */}
            <Link
              href="/donor"
              className="px-4 py-2 rounded-xl bg-blood-600 hover:bg-blood-700 text-white text-xs sm:text-sm font-semibold font-inter shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
            >
              <Droplet className="w-4 h-4 fill-white text-white" />
              <span>Become a Donor</span>
            </Link>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-11 h-11 flex items-center justify-center rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Slide-Over Drawer Navigation + Backdrop via Portal */}
      {mounted &&
        mobileMenuOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] md:hidden bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 flex justify-start overflow-hidden w-full h-full"
            onClick={() => setMobileMenuOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            <aside
              className="relative w-full max-w-[310px] sm:max-w-sm h-full bg-white shadow-2xl flex flex-col justify-between overflow-hidden drawer-slide-in-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Header */}
              <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 bg-white shrink-0 min-w-0 w-full">
                <div className="min-w-0 flex-1 pr-2 overflow-hidden">
                  <Logo variant="horizontal" size="sm" href="/" priority />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Navigation Body */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3 font-inter min-w-0 w-full">
                <nav aria-label="Mobile Navigation" className="space-y-1">
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-colors min-w-0",
                      pathname === "/"
                        ? "bg-primary-50 text-primary-700"
                        : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Home className="w-4 h-4 text-primary-600 shrink-0" />
                    <span className="truncate">Home</span>
                  </Link>

                  {/* Solutions & Modules Section */}
                  <div className="pt-2">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-poppins">
                      Solutions &amp; Platform
                    </div>
                    <div className="mt-1.5 space-y-2">
                      <Link
                        href="/#solutions"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all bg-white min-w-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blood-50 text-blood-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Droplet className="w-4 h-4 fill-blood-600 text-blood-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 font-poppins truncate">
                            ORBINOVA Donor
                          </div>
                          <div className="text-[11px] text-slate-500 truncate leading-snug">
                            Donor coordination &amp; blood matching
                          </div>
                        </div>
                      </Link>

                      <Link
                        href="/#solutions"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all bg-white min-w-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 mt-0.5">
                          <ScanLine className="w-4 h-4 text-teal-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 font-poppins truncate">
                            ORBINOVA Imaging
                          </div>
                          <div className="text-[11px] text-slate-500 truncate leading-snug">
                            AI medical imaging &amp; diagnostics
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* Portals & Ecosystem Quick Links */}
                  <div className="pt-2">
                    <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-poppins">
                      Healthcare Portals
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      <Link
                        href="/hospitals"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 min-w-0 border border-slate-100 bg-slate-50/60 hover:bg-slate-100/70",
                          pathname === "/hospitals"
                            ? "bg-primary-50 text-primary-700 border-primary-200"
                            : "text-slate-700 hover:text-slate-900"
                        )}
                      >
                        <Building2 className="w-4 h-4 text-primary-600 shrink-0" />
                        <span className="truncate">Hospitals</span>
                      </Link>
                      <Link
                        href="/blood-banks"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 min-w-0 border border-slate-100 bg-slate-50/60 hover:bg-slate-100/70",
                          pathname === "/blood-banks"
                            ? "bg-blood-50 text-blood-700 border-blood-200"
                            : "text-slate-700 hover:text-slate-900"
                        )}
                      >
                        <Droplet className="w-4 h-4 text-blood-600 shrink-0" />
                        <span className="truncate">Blood Banks</span>
                      </Link>
                      <Link
                        href="/how-it-works"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 min-w-0 border border-slate-100 bg-slate-50/60 hover:bg-slate-100/70",
                          pathname === "/how-it-works"
                            ? "bg-primary-50 text-primary-700 border-primary-200"
                            : "text-slate-700 hover:text-slate-900"
                        )}
                      >
                        <Layers className="w-4 h-4 text-primary-600 shrink-0" />
                        <span className="truncate">How It Works</span>
                      </Link>
                      <Link
                        href="/faq"
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          "px-2.5 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 min-w-0 border border-slate-100 bg-slate-50/60 hover:bg-slate-100/70",
                          pathname === "/faq"
                            ? "bg-primary-50 text-primary-700 border-primary-200"
                            : "text-slate-700 hover:text-slate-900"
                        )}
                      >
                        <HelpCircle className="w-4 h-4 text-primary-600 shrink-0" />
                        <span className="truncate">FAQ</span>
                      </Link>
                    </div>
                  </div>

                  {/* Core Navigation Links */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <Link
                      href="/about"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors min-w-0",
                        pathname === "/about"
                          ? "bg-primary-50 text-primary-700"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <Info className="w-4 h-4 text-primary-600 shrink-0" />
                      <span className="truncate">About Us</span>
                    </Link>

                    <Link
                      href="/contact"
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors min-w-0",
                        pathname === "/contact"
                          ? "bg-primary-50 text-primary-700"
                          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <PhoneCall className="w-4 h-4 text-primary-600 shrink-0" />
                      <span className="truncate">Contact Us</span>
                    </Link>
                  </div>
                </nav>
              </div>

              {/* Dedicated Pinned Footer Actions */}
              <div className="p-4 border-t border-slate-100 bg-slate-50/90 space-y-2.5 shrink-0 min-w-0 w-full">
                <Link
                  href="/donor"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-blood-600 hover:bg-blood-700 active:bg-blood-800 text-white text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Droplet className="w-4 h-4 fill-white text-white shrink-0" />
                  <span className="truncate">Become a Donor</span>
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-primary-500 text-primary-600 hover:bg-primary-50 active:bg-primary-100 text-center text-sm font-semibold flex items-center justify-center gap-2 transition-colors bg-white"
                >
                  <User className="w-4 h-4 text-primary-600 shrink-0" />
                  <span className="truncate">Portal Sign In</span>
                </Link>
                <p className="pt-1 text-center text-[11px] text-slate-400 font-medium truncate">
                  ORBINOVA Healthcare Intelligence
                </p>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </header>
  );
};
