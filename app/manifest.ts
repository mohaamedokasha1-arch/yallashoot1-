import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} | ${SITE.nameEn}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    display: "browser",
    dir: "rtl",
    lang: "ar",
    background_color: "#f8fafc",
    theme_color: SITE.themeColor,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
