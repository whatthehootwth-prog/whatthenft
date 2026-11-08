import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@wtn/domain", "@wtn/chain"],
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/hatch", destination: "/mint", permanent: false },
      { source: "/market", destination: "/marketplace", permanent: false },
      { source: "/collection", destination: "/marketplace", permanent: false },
      { source: "/faq", destination: "/wth", permanent: false },
      { source: "/wtf", destination: "/wth", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default config;
