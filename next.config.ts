import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // output and images are what they are because we will support SSR later
  output: "export",
  images: { unoptimized: true },
}

export default nextConfig
