/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Forces Next.js to build a static HTML/CSS/JS site
  images: {
    unoptimized: true, // Required for static exports
  },
  // Build commit from Cloudflare Pages, saved with every sync (app_version).
  env: {
    NEXT_PUBLIC_CF_PAGES_COMMIT_SHA: process.env.CF_PAGES_COMMIT_SHA ?? 'dev',
  },
};
export default nextConfig;