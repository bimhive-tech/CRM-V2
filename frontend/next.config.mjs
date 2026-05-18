/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "633c2464b38a51b3a7f9141ddbc37c41.r2.cloudflarestorage.com",
      },
    ],
  },
};

export default nextConfig;
