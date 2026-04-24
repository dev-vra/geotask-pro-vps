import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",

  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' https://173.249.47.131 https://geotask-pro.vercel.app https://geotask.duckdns.org; frame-ancestors 'none'; object-src 'none';",
          },
        ],
      },
    ];
  },

  // Allowed origins for Server Actions and RSC
  experimental: {
    serverActions: {
      allowedOrigins: ["geotask-pro.vercel.app", "geotask.duckdns.org"],
    },
  },
};

export default nextConfig;
