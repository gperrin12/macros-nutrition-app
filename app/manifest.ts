import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "macros",
    short_name: "macros",
    description: "A personal macro tracker. Type what you ate; it does the rest.",
    start_url: "/",
    display: "standalone",
    background_color: "#0c0d0b",
    theme_color: "#0c0d0b",
    orientation: "portrait",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
