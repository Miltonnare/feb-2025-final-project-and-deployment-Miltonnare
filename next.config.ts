import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  turbopack: {
    // Sets the Turbopack root directory explicitly to the project root folder
    root: path.resolve(__dirname),
  },
}

export default nextConfig
