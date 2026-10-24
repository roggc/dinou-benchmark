/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16 ya no expone `experimental.ppr`: el prerender parcial se activa con
  // cacheComponents, que prerenderiza el shell estático y deja los huecos
  // dinámicos (los que esperan `connection()`) para el streaming de la petición.
  cacheComponents: true,
  // Next 16 bloquea las peticiones de HMR cuyo Origin no está declarado y el
  // harness abre el navegador en 127.0.0.1 (no en localhost). Sin esto el
  // WebSocket de Fast Refresh se rechaza y el HMR nunca se refleja.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;

