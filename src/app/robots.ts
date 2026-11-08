import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.orbinova.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/hospital/",
          "/donor/dashboard",
          "/donor/profile",
          "/donor/requests",
          "/donor/donations",
          "/donor/availability",
          "/donor/eligibility",
          "/donor/notifications",
          "/donor/settings",
          "/api/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
