import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler: true, // Disabled - requires babel-plugin-react-compiler

  async rewrites() {
    return [
      // All API routes: /api/* -> http://localhost:8072/api/*
      {
        source: "/api/:path*",
        destination: "http://localhost:8072/api/:path*",
      },
    ]
  },
};

export default nextConfig;

