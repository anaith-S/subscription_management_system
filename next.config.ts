import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/auth/signup", destination: "/api/auth/signup" },
      { source: "/auth/login", destination: "/api/auth/login" },
      { source: "/auth/forgot-password", destination: "/api/auth/forgot-password" },
      { source: "/auth/reset-password", destination: "/api/auth/reset-password" },
      { source: "/auth/me", destination: "/api/auth/me" },
      { source: "/auth/staff", destination: "/api/auth/staff" },
    ];
  },
};

export default nextConfig;
