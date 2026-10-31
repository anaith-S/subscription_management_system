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
      { source: "/catalog/:path*", destination: "/api/catalog/:path*" },
      { source: "/api/products/:path*", destination: "/api/catalog/products/:path*" },
      { source: "/api/products", destination: "/api/catalog/products" },
      { source: "/api/plans/:path*", destination: "/api/catalog/plans/:path*" },
      { source: "/api/plans", destination: "/api/catalog/plans" },
      { source: "/api/taxes/:path*", destination: "/api/catalog/taxes/:path*" },
      { source: "/api/taxes", destination: "/api/catalog/taxes" },
      { source: "/api/discounts/:path*", destination: "/api/catalog/discounts/:path*" },
      { source: "/api/discounts", destination: "/api/catalog/discounts" },
      { source: "/reports/summary", destination: "/api/reports/summary" },
      { source: "/reports/:path*", destination: "/api/reports/:path*" },
      { source: "/reports", destination: "/api/reports" },
    ];
  },
};

export default nextConfig;
