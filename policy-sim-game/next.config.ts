/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // This tells Next.js to use relative paths for all your CSS and JS
  assetPrefix: './',
  images: {
    unoptimized: true, // Often needed for static exports
  },
};

module.exports = nextConfig;