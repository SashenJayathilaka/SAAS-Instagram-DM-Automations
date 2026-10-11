import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AP3K — Instagram Comment & DM Automation",
    short_name: "AP3K",
    description: "Turn Instagram comments into instant replies, DMs and trackable leads.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1020",
    theme_color: "#6D28D9",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
