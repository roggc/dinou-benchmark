let received = 0;
let finished = 0;
let maxDurationMs = 0;
let slowOver1s = 0;
let totalDurationMs = 0;
let topSlowInsideNode = [];

let testStartTime = 0;
let totalConnections = 0;
let maxWaitBeforeFirstReqMs = 0;
let maxSocketAcceptedRelMs = 0;
let slowFirstReqs = [];

export default {
  plugins: [
    {
      name: "tune-keepalive",
      configureServer({ server, use }) {
        console.log(`[Dinou Config] configureServer EXECUTED! keepAliveTimeout: ${server.keepAliveTimeout} -> 65000`);
        server.keepAliveTimeout = 65000;
        server.headersTimeout = 66000;

        server.on("connection", (socket) => {
          totalConnections++;
          const now = Date.now();
          socket._acceptedAt = now;
          socket._acceptedRelMs = testStartTime ? Math.max(0, now - testStartTime) : 0;
          socket._reqCount = 0;
          if (socket._acceptedRelMs > maxSocketAcceptedRelMs) {
            maxSocketAcceptedRelMs = socket._acceptedRelMs;
          }
        });

        use((req, res, next) => {
          if (req.url === "/__stats") {
            res.statusCode = 200;
            res.setHeader("content-type", "application/json");
            res.end(
              JSON.stringify({
                received,
                finished,
                inFlight: received - finished,
                maxDurationMs,
                avgDurationMs: finished > 0 ? (totalDurationMs / finished).toFixed(2) : 0,
                slowOver1s,
                topSlowInsideNode: topSlowInsideNode.sort((a, b) => b.durationMs - a.durationMs).slice(0, 5),
                totalConnections,
                maxSocketAcceptedRelMs,
                maxWaitBeforeFirstReqMs,
                slowFirstReqs: slowFirstReqs.sort((a, b) => b.waitMs - a.waitMs).slice(0, 10),
              })
            );
            return;
          }
          if (req.url === "/__reset_stats") {
            testStartTime = Date.now();
            received = 0;
            finished = 0;
            maxDurationMs = 0;
            slowOver1s = 0;
            totalDurationMs = 0;
            topSlowInsideNode = [];
            totalConnections = 0;
            maxSocketAcceptedRelMs = 0;
            maxWaitBeforeFirstReqMs = 0;
            slowFirstReqs = [];
            res.statusCode = 200;
            res.end("ok");
            return;
          }

          const reqStart = Date.now();
          const socket = req.socket;
          if (socket) {
            socket._reqCount = (socket._reqCount || 0) + 1;
            if (socket._reqCount === 1 && socket._acceptedAt) {
              const waitMs = reqStart - socket._acceptedAt;
              if (waitMs > maxWaitBeforeFirstReqMs) {
                maxWaitBeforeFirstReqMs = waitMs;
              }
              if (waitMs > 1000) {
                slowFirstReqs.push({
                  url: req.url,
                  waitMs,
                  acceptedRelMs: socket._acceptedRelMs,
                });
              }
            }
          }

          received++;

          res.on("finish", () => {
            finished++;
            const duration = Date.now() - reqStart;
            totalDurationMs += duration;
            if (duration > maxDurationMs) {
              maxDurationMs = duration;
            }
            if (duration > 1000) {
              slowOver1s++;
            }
            if (duration > 100) {
              topSlowInsideNode.push({ url: req.url, durationMs: duration });
              if (topSlowInsideNode.length > 20) {
                topSlowInsideNode.sort((a, b) => b.durationMs - a.durationMs);
                topSlowInsideNode = topSlowInsideNode.slice(0, 10);
              }
            }
          });

          next();
        });
      },
    },
  ],
};
