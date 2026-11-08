import { MetadataRoute } from "next";
import { BRAND } from "@/constants/theme";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ORBINOVA — Integrated Healthcare Intelligence Platform",
    short_name: "ORBINOVA",
    description: "Connecting Healthcare. Advancing Intelligence. Saving Lives.",
    start_url: "/",
    display: "standalone",
    background_color: "#F8FAFC",
    theme_color: "#2563EB",
    icons: [
      {
        src: "/images/orbinova-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
