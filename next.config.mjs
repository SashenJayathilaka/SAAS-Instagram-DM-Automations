/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingIncludes: { "/blog/[slug]": ["./lib/content/imported-blog/*.html"] },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-*",
      },
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
    ],
  },
  async redirects() {
    return [
      { source: "/resources/instagram-comment-to-dm-templates", destination: "/docs/post-automation/post-automation-templates", permanent: true },
      { source: "/resources/instagram-growth-library", destination: "/blog", permanent: true },
      {"source": "/blog/get-started-with-linktodm", "destination": "/blog/get-started-with-ap3k", "permanent": true},
      {"source": "/blog/how-to-schedule-automations-with-linktodm", "destination": "/blog/how-to-schedule-automations-with-ap3k", "permanent": true},
      {"source": "/blog/linktodm-is-officially-a-meta-business-partner", "destination": "/blog/how-ap3k-connects-through-instagram-api", "permanent": true},
      {"source": "/blog/10-ways-linktodm-helps-you-automate-and-scale-instagram-marketing", "destination": "/blog/10-ways-ap3k-helps-you-automate-and-scale-instagram-marketing", "permanent": true},
      {"source": "/blog/how-to-set-up-facebook-dm-automation-using-linktodm", "destination": "/blog/how-to-set-up-instagram-dm-automation-using-ap3k", "permanent": true},

      {
        source: "/ap3k-admin",
        destination: "/admin/overview",
        permanent: true,
      },
      {
        source: "/ap3k-admin-v2",
        destination: "/admin/overview",
        permanent: true,
      },
      {
        source: "/ap3k-admin-v2/:path*",
        destination: "/admin/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      // Send indexing rules on the responses themselves rather than publishing
      // an inventory of internal routes in robots.txt. These are not auth rules.
      ...[
        "admin",
        "ap3k-admin",
        "ap3k-admin-v2",
        "api",
        "dashboard",
        "onboarding",
        "payment",
        "callback",
      ].map((route) => ({
        source: `/${route}/:path*`,
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      })),
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // Same-origin recording still requires the browser's microphone permission.
            // Keep this on the document: client-side navigation retains its policy.
            value: "geolocation=(), microphone=(self), browsing-topics=()",
          },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
