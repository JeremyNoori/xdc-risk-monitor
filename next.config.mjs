/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure server-only env vars are never bundled into the client
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;
