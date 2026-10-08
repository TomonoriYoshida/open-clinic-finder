import type { MetadataRoute } from "next";
import { siteDescription, siteName } from "@/lib/site";

export const dynamic = "force-static";

/** Lets visitors add the site to their home screen like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "開いてる病院",
    description: siteDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f766e",
    lang: "ja",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
