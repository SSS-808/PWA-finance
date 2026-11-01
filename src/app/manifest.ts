import type { MetadataRoute } from "next";
import { en } from "@/messages/en";
import { themeColors } from "./theme-colors";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: en.app.name,
    short_name: en.app.shortName,
    description: en.app.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: themeColors.light,
    theme_color: themeColors.light,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      // The drawing sits inside the middle 80%, so Android can crop it to a circle
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
