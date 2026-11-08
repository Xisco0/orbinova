import type { Metadata, Viewport } from "next";
import { AOSProvider } from "@/components/providers/AOSProvider";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563EB",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://www.orbinova.com"),
  title: {
    template: "%s | ORBINOVA",
    default: "ORBINOVA | Integrated Healthcare Intelligence Platform",
  },
  description:
    "ORBINOVA connects healthcare institutions, donor coordination, and AI-assisted medical imaging through an integrated healthcare intelligence platform.",
  keywords: [
    "ORBINOVA",
    "healthcare intelligence",
    "ORBINOVA Donor",
    "ORBINOVA Imaging",
    "medical imaging AI",
    "donor coordination",
    "clinical decision support",
    "blood bank coordination",
    "hospital intelligence",
  ],
  icons: {
    icon: "/images/orbinova-logo.png",
    shortcut: "/images/orbinova-logo.png",
    apple: "/images/orbinova-logo.png",
  },
  openGraph: {
    title: "ORBINOVA | Integrated Healthcare Intelligence Platform",
    description:
      "Connecting Healthcare. Advancing Intelligence. Saving Lives. Integrated platform for donor coordination and AI-assisted medical imaging.",
    siteName: "ORBINOVA",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/images/orbinova-logo.png",
        width: 800,
        height: 800,
        alt: "ORBINOVA Integrated Healthcare Intelligence",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-app-background font-inter text-app-text flex flex-col">
        <ToastProvider>
          <AOSProvider>{children}</AOSProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
