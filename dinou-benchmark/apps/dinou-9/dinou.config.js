let received = 0;
let finished = 0;

export default {
  plugins: [
    {
      name: "tune-keepalive",
      configureServer({ server, use }) {
        console.log(`[Dinou Config] configureServer EXECUTED! keepAliveTimeout: ${server.keepAliveTimeout} -> 65000`);
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;

        use((req, res, next) => {
          if (req.url === "/__stats") {
            res.statusCode = 200;
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify({ received, finished, inFlight: received - finished }));
            return;
          }
          if (req.url === "/__reset_stats") {
            received = 0;
            finished = 0;
            res.statusCode = 200;
            res.end("ok");
            return;
          }
          received++;
          res.on("finish", () => finished++);
          next();
        });
      },
    },
  ],
};
