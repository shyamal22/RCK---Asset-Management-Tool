import type { MetadataRoute } from "next";

/** Installable on phones ("Add to Home Screen"): opens full screen, portrait, onyx behind the status bar. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "KRE Asset Management Tool",
    short_name: "KRE Assets",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b10",
    theme_color: "#0b0b10",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
