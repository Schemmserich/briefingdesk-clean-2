import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/[^/]+\.supabase\.co\/.*$/i,
      handler: "NetworkOnly",
      options: {
        cacheName: "supabase-network-only",
      },
    },
    {
      urlPattern: /\/api\/.*$/i,
      handler: "NetworkOnly",
      options: {
        cacheName: "api-network-only",
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
