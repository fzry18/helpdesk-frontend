import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API routes are now local Next.js Route Handlers (no Odoo proxy needed)
  // Auth is proxied to Odoo Live from within Route Handlers (BFF pattern)

  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
