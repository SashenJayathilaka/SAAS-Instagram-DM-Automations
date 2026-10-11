import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Keep internal route names out of this public file. Access is enforced
        // by server authorization; private responses carry noindex headers.
        // Crawlers must be able to fetch a response to see its noindex rule.
        allow: "/",
      },
    ],
    sitemap: ["https://ap3k.com/sitemap.xml", "https://ap3k.com/video-sitemap.xml"],
  };
}
