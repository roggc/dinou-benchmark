#!/usr/bin/env node
/**
 * Rigorous Autocannon timeout diagnostic tool for any route (default: /rigorous/cache-slot):
 *
 * Usage:
 *   node scripts/diagnose-timeouts.mjs
 *   ROUTE=/rigorous/cache-slot node scripts/diagnose-timeouts.mjs
 *   node scripts/diagnose-timeouts.mjs --route=/rigorous/cache-slot
 *
 * Tests 3 scenarios against Dinou 9.0.3 (with DIAGNOSE=1 internal server instrumentation):
 * 1. 200 Connections, Keep-Alive, 5s Warmup -> 30s Run (timeout: 30s) — exact replica of load.mjs
 * 2. 50 Connections, Keep-Alive, 30s Run (timeout: 30s)
 * 3. 200 Connections, Connection: close (No Keep-Alive), 30s Run (timeout: 30s)
 */
import path from "node:path";
import autocannon from "autocannon";
import { ROOT } from "./config.mjs";
import { startServer } from "./lib.mjs";

const cwd = path.join(ROOT, "apps/dinou-9");
const cliRoute = process.argv.find((a) => a.startsWith("--route="))?.split("=")[1];
const routePath = process.env.ROUTE || cliRoute || "/rigorous/cache-slot";
const durationSec = Number(process.env.DURATION || 30);
const timeoutSec = Number(process.env.TIMEOUT || 30);

async function runScenario({ name, connections = 200, warmupSec = 0, headers = {} }) {
  console.log(`\n============================================================`);
  console.log(`SCENARIO: ${name}`);
  console.log(`Route: ${routePath} | Connections: ${connections} | Duration: ${durationSec}s | Timeout: ${timeoutSec}s`);
  console.log(`============================================================`);

  const server = await startServer({
    cwd,
    cmd: "pnpm",
    args: ["run", "start"],
    port: 3121,
    readyPath: "/",
    env: { DIAGNOSE: "1" },
  });

  try {
    const targetUrl = `${server.url}${routePath}`;

    if (warmupSec > 0) {
      console.log(`→ Running ${warmupSec}s warmup at ${connections} connections (matching load.mjs)...`);
      await new Promise((resolve) => {
        autocannon(
          {
            url: targetUrl,
            connections,
            duration: warmupSec,
            timeout: Math.max(30, warmupSec),
            pipelining: 1,
          },
          () => resolve()
        );
      });
    }

    // Reset internal server counters right before measured pass
    try {
      await fetch(`${server.url}/__reset_stats`);
    } catch {}

    console.log(`→ Launching ${connections} connections for ${durationSec}s (timeout: ${timeoutSec}s)...`);
    const timestamps = [];
    const started = Date.now();

    const result = await new Promise((resolve) => {
      const inst = autocannon(
        {
          url: targetUrl,
          connections,
          duration: durationSec,
          timeout: timeoutSec,
          pipelining: 1,
          headers,
        },
        (err, res) => resolve(res)
      );

      inst.on("reqError", (err) => {
        const elapsed = ((Date.now() - started) / 1000).toFixed(2);
        timestamps.push(Number(elapsed));
        if (timestamps.length <= 10) {
          console.log(`  [+${elapsed}s] reqError: ${err.code || err.message}`);
        } else if (timestamps.length === 11) {
          console.log(`  ... (suppressing further per-error logs)`);
        }
      });
    });

    // Check internal server stats
    let stats = null;
    try {
      const statsRes = await fetch(`${server.url}/__stats`);
      if (statsRes.ok) stats = await statsRes.json();
    } catch {}

    console.log(`\n--- AUTOCANNON CLIENT RESULTS (${name}) ---`);
    console.log(`Throughput (req/s)               : ${result.requests.average}`);
    console.log(`Latency p50 / p99                : ${result.latency.p50} ms / ${result.latency.p99} ms`);
    console.log(`Total completed requests         : ${result.requests.total}`);
    console.log(`Timeouts reported by autocannon  : ${result.timeouts}`);
    console.log(`Errors reported by autocannon    : ${result.errors}`);

    if (stats) {
      console.log(`\n--- INTERNAL DINOU SERVER METRICS (/__stats) ---`);
      console.log(`Server received HTTP requests    : ${stats.received}`);
      console.log(`Server finished HTTP responses   : ${stats.finished}`);
      console.log(`Hanging/Unfinished in-flight     : ${stats.inFlight}`);
      console.log(`Average duration inside Node     : ${stats.avgDurationMs} ms`);
      console.log(`Max duration inside Node         : ${stats.maxDurationMs} ms`);
      console.log(`Requests > 1s inside Node        : ${stats.slowOver1s}`);
      console.log(`Total TCP sockets accepted       : ${stats.totalConnections} (out of ${connections})`);
      console.log(`Latest socket accepted at        : +${(stats.maxSocketAcceptedRelMs / 1000).toFixed(3)}s`);
      console.log(`Max wait accept() -> 1st req     : ${(stats.maxWaitBeforeFirstReqMs / 1000).toFixed(3)}s`);
    }

    if (timestamps.length > 0) {
      const minT = Math.min(...timestamps);
      const maxT = Math.max(...timestamps);
      const atTimeoutMark = timestamps.filter((t) => t >= timeoutSec - 0.5 && t <= timeoutSec + 1.5).length;
      console.log(`\n--- TIMEOUT TIMESTAMP ANALYSIS ---`);
      console.log(`Total timeouts recorded          : ${timestamps.length}`);
      console.log(`Timeouts firing at ~${timeoutSec}s (sent at t=0s burst): ${atTimeoutMark} (${((atTimeoutMark / timestamps.length) * 100).toFixed(1)}%)`);
      console.log(`Earliest / Latest timeout fired  : +${minT.toFixed(2)}s / +${maxT.toFixed(2)}s`);
    } else {
      console.log(`\n--- TIMEOUT TIMESTAMP ANALYSIS: 0 timeouts occurred! ---`);
    }
  } finally {
    await server.stop();
    await new Promise((r) => setTimeout(r, 1000));
  }
}

console.log(`Starting Timeout Origin Isolation Suite for route: ${routePath}...\n`);

await runScenario({
  name: "1. REPLICA OF LOAD.MJS (200 Conn, 5s Warmup, 30s Run, Keep-Alive)",
  connections: 200,
  warmupSec: 5,
});

await runScenario({
  name: "2. MODERATE CONCURRENCY (50 Conn, 30s Run, Keep-Alive)",
  connections: 50,
  warmupSec: 3,
});

await runScenario({
  name: "3. 200 CONN WITHOUT KEEP-ALIVE (Connection: close)",
  connections: 200,
  warmupSec: 3,
  headers: { Connection: "close" },
});

console.log("\n============================================================");
console.log("Isolation Suite Completed.");
console.log("============================================================\n");
