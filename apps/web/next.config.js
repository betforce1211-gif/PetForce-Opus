/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@petforce/ui", "@petforce/core"],
  reactStrictMode: true,
};

module.exports = nextConfig;
