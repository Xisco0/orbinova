"use client";

import React, { useState, useEffect } from "react";

export const ScrollToTop: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      setIsScrolled(scrollPosition > 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    // 1. Direct native smooth scroll on window
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });

    // 2. Also trigger on documentElement if it has scroll
    if (document.documentElement && document.documentElement.scrollTop > 0) {
      document.documentElement.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }

    // 3. Robust fallback: if browser smooth scroll gets interrupted, smoothly step to 0
    const initialY =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    if (initialY > 0) {
      setTimeout(() => {
        const currentY =
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          document.body.scrollTop ||
          0;

        // If the browser didn't scroll or stopped early, animate frame by frame
        if (currentY > 10) {
          const startTime = performance.now();
          const duration = 300;
          const start = currentY;

          const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const nextY = Math.round(start * (1 - ease));

            window.scrollTo(0, nextY);
            if (document.documentElement) document.documentElement.scrollTop = nextY;
            if (document.body) document.body.scrollTop = nextY;

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
              window.scrollTo(0, 0);
              if (document.documentElement) document.documentElement.scrollTop = 0;
              if (document.body) document.body.scrollTop = 0;
            }
          };

          requestAnimationFrame(step);
        }
      }, 80);
    }
  };

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll back to top of page"
      title="Back To Top"
      tabIndex={isScrolled ? 0 : -1}
      aria-hidden={!isScrolled}
      className={`fixed p-2.5 sm:p-3.5 bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 text-white rounded-xl cursor-pointer transition-all duration-300 bg-primary-600 hover:bg-primary-700 active:scale-90 border-2 border-white shadow-xl shadow-primary-950/30 ${
        isScrolled
          ? "opacity-100 translate-y-0 scale-100 hover:scale-110 pointer-events-auto"
          : "opacity-0 translate-y-4 scale-90 pointer-events-none"
      }`}
      style={{ touchAction: "manipulation" }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 448 512"
        fill="currentColor"
        className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 hover:-translate-y-0.5"
        aria-hidden="true"
      >
        <path d="M128 40c0-22.1 17.9-40 40-40s40 17.9 40 40v148.2c8.5-7.6 19.7-12.2 32-12.2c20.6 0 38.2 13 45 31.2c8.8-9.3 21.2-15.2 35-15.2c25.3 0 46 19.5 47.9 44.3c8.5-7.7 19.8-12.3 32.1-12.3c26.5 0 48 21.5 48 48v112c0 70.7-57.3 128-128 128l-85.3 0c-35.3 0-68.8-14.6-93.1-40.3l-85-90.1c-15.3-16.3-14.6-41.9 1.6-57.3s41.9-14.6 57.3 1.6L128 352.6V40z" />
      </svg>
    </button>
  );
};

export default ScrollToTop;
