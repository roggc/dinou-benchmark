export default {
  plugins: [
    {
      name: "tune-keepalive",
      configureServer({ server }) {
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
      },
    },
  ],
};
