import type { NextConfig } from "next";

// Check if we are building for production (GitHub Pages) or running locally
const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  // Only apply the GitHub Pages paths if we are doing a production build
  basePath: isProd ? '/PrimeMinisterGame-React' : '',
  assetPrefix: isProd ? '/PrimeMinisterGame-React/' : '', 
};

export default nextConfig;