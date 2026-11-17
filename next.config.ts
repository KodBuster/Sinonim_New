import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Link previews must receive their metadata in the initial HTML head.
  htmlLimitedBots: /.*/,
  serverExternalPackages: ["sharp", "sql.js"],
  outputFileTracingIncludes: {
    "/api/reviews/*": ["./node_modules/sql.js/dist/sql-wasm.wasm"],
  },
  images: {
    localPatterns: [
      {
        pathname: "/images/**",
      },
      {
        pathname: "/redesign/**",
      },
      {
        pathname: "/api/advantshop-image",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s4.advantme.ru",
      },
      {
        protocol: "https",
        hostname: "**.on-advantshop.net",
      },
      {
        protocol: "http",
        hostname: "synonym-925.ru",
      },
      {
        protocol: "https",
        hostname: "synonym-925.ru",
      },
      {
        protocol: "http",
        hostname: "shop.synonym-jewelry.ru",
      },
      {
        protocol: "https",
        hostname: "shop.synonym-jewelry.ru",
      },
      {
        protocol: "https",
        hostname: "synonym-jewelry.ru",
      },
      {
        protocol: "https",
        hostname: "www.synonym-jewelry.ru",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/videos/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
