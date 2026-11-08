import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.orbinova.com";
  const now = new Date();

  // Public indexable routes only — private portals are excluded
  const publicRoutes = [
    "",
    "/about",
    "/how-it-works",
    "/donor",
    "/hospitals",
    "/blood-banks",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/login",
    "/donor/login",
    "/donor/register",
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : route.startsWith("/donor") || route.startsWith("/hospitals") ? 0.8 : 0.6,
  }));
}
