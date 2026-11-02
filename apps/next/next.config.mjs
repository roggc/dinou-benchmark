/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16 no longer exposes `experimental.ppr`: partial prerendering is enabled with
  // cacheComponents, which prerenders the static shell and defers dynamic holes
  // (those awaiting `connection()`) to request-time streaming.
  cacheComponents: true,
  // Next 16 blocks HMR requests whose Origin is not declared, and the
  // harness opens the browser on 127.0.0.1 (not localhost). Without this,
  // the Fast Refresh WebSocket is rejected and HMR never reflects.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;

