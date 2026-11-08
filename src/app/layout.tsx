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

const productionDomain =
  process.env.NEXT_PUBLIC_APP_URL &&
  !process.env.NEXT_PUBLIC_APP_URL.includes("localhost") &&
  !process.env.NEXT_PUBLIC_APP_URL.includes("127.0.0.1")
    ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/+$/, "")
    : "https://www.orbinova.com";

const siteUrl = productionDomain;
const ogImageUrl = `${siteUrl}/orbinova-og.png`;
const canonicalUrl = `${siteUrl}/`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: "%s | ORBINOVA",
    default: "ORBINOVA | Integrated Healthcare Intelligence",
  },
  description:
    "ORBINOVA connects healthcare through technology and artificial intelligence, advancing donor matching, blood bank coordination, and AI-assisted medical imaging.",
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
  alternates: {
    canonical: canonicalUrl,
  },
  icons: {
    icon: "/images/orbinova-logo.png",
    shortcut: "/images/orbinova-logo.png",
    apple: "/images/orbinova-logo.png",
  },
  openGraph: {
    type: "website",
    siteName: "ORBINOVA",
    locale: "en_US",
    title: "ORBINOVA | Integrated Healthcare Intelligence",
    description:
      "ORBINOVA connects healthcare through technology and artificial intelligence, advancing donor matching, blood bank coordination, and AI-assisted medical imaging.",
    url: canonicalUrl,
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "ORBINOVA Integrated Healthcare Intelligence platform banner.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ORBINOVA | Integrated Healthcare Intelligence",
    description:
      "ORBINOVA connects healthcare through technology and artificial intelligence, advancing donor matching, blood bank coordination, and AI-assisted medical imaging.",
    images: [
      {
        url: ogImageUrl,
        alt: "ORBINOVA Integrated Healthcare Intelligence platform banner.",
        width: 1200,
        height: 630,
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
