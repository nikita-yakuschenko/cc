import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // standalone нужен для Docker/Dokploy; локально тоже совместим через npm start
  output: "standalone",
};

export default nextConfig;
