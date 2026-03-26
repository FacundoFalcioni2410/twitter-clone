import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT === "standalone" && { output: "standalone" }),
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"],
};

export default nextConfig;
