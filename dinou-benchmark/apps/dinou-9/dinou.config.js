export default {
  plugins: [
    {
      name: "tune-keepalive",
      configureServer({ server }) {
        console.log(`[Dinou Config] configureServer EXECUTED! keepAliveTimeout: ${server.keepAliveTimeout} -> 65000`);
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;
      },
    },
  ],
};
