"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import AOS from "aos";
import "aos/dist/aos.css";

export const AOSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();

  useEffect(() => {
    AOS.init({
      duration: 900,
      easing: "ease-out-cubic",
      once: true,
      offset: 40,
      disableMutationObserver: false,
    });
  }, []);

  useEffect(() => {
    AOS.refresh();
  }, [pathname]);

  return <>{children}</>;
};

export default AOSProvider;
