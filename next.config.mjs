/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build outside Dropbox-watched folder to avoid sync race conditions
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};
export default nextConfig;
