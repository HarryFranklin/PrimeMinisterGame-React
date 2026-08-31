/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Forces Next.js to build a static HTML/CSS/JS site
  images: {
    unoptimized: true, // Required for static exports
  }
};
export default nextConfig;