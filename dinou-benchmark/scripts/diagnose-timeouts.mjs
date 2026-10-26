#!/usr/bin/env node
/**
 * Rigorous diagnostic tool to isolate the exact cause of the 18 timeouts:
 *
 * 1. Test Cold Burst (No Warmup): 200 connections burst into cold server.
 * 2. Test Warmup First: 1 single request to warm up, then 200 connections.
 * 3. Test Cold Connection: close: 200 connections with no persistent sockets.
 *
 * For each test, checks:
 * - Server stats: received vs finished (did a promise hang inside Dinou?)
 * - Autocannon timeouts & errors
 * - Error timestamps
 */
import path from "node:path";
import autocannon from "autocannon";
import { ROOT } from "./config.mjs";
import { startServer } from "./lib.mjs";

const cwd = path.join(ROOT, "apps/dinou-9");

async function runScenario({ name, warmup = false, headers = {} }) {
  console.log(`\n============================================================`);
  console.log(`SCENARIO: ${name}`);
  console.log(`============================================================`);

  const server = await startServer({
    cwd,
    cmd: "pnpm",
    args: ["run", "start"],
    port: 3103,
    readyPath: "/",
  });

  try {
    if (warmup) {
      console.log("→ Performing 1 single warmup request to warm up caches/JIT...");
      const warmRes = await fetch(`${server.url}/`);
      console.log(`  Warmup response: ${warmRes.status} in status OK`);
      await new Promise((r) => setTimeout(r, 500));
    }

    // Reset internal server counters
    await fetch(`${server.url}/__reset_stats`);

    console.log("→ Launching 200 connections for 15 seconds (timeout: 10s)...");
    const timestamps = [];
    const started = Date.now();

    const result = await new Promise((resolve) => {
      const inst = autocannon(
        {
          url: `${server.url}/`,
          connections: 200,
          duration: 15,
          timeout: 10,
          pipelining: 1,
          headers,
        },
        (err, res) => resolve(res)
      );

      inst.on("reqError", (err) => {
        const elapsed = ((Date.now() - started) / 1000).toFixed(2);
        timestamps.push(Number(elapsed));
        console.log(`  [+${elapsed}s] reqError: ${err.code || err.message}`);
      });
    });

    // Check internal server stats
    let stats = { received: "—", finished: "—", inFlight: "—" };
    try {
      const statsRes = await fetch(`${server.url}/__stats`);
      stats = await statsRes.json();
    } catch {}

    console.log(`\n--- RESULTS FOR: ${name} ---`);
    console.log(`Total requests sent by autocannon: ${result.requests.total}`);
    console.log(`Timeouts reported by autocannon  : ${result.timeouts}`);
    console.log(`Errors reported by autocannon    : ${result.errors}`);
    console.log(`Server received HTTP requests    : ${stats.received}`);
    console.log(`Server finished HTTP responses   : ${stats.finished}`);
    console.log(`Hanging/Unfinished requests      : ${stats.inFlight}`);

    if (timestamps.length > 0) {
      const atStart = timestamps.filter((t) => t >= 9.5 && t <= 11.0).length;
      console.log(`\nTimestamp analysis:`);
      console.log(`  Timeouts clustered at ~10s (sent at t=0s): ${atStart}`);
      console.log(`  Other timestamps                         : ${timestamps.length - atStart}`);
    } else {
      console.log(`\nTimestamp analysis: 0 timeouts occurred!`);
    }
  } finally {
    await server.stop();
    await new Promise((r) => setTimeout(r, 1000));
  }
}

console.log("Starting Timeout Origin Isolation Suite...\n");

// Scenario 1: Cold start + burst (identifies if initial cold burst drops requests)
await runScenario({
  name: "1. COLD START BURST (No Warmup, Keep-Alive)",
  warmup: false,
});

// Scenario 2: Warmup first (identifies if lazy loading / module initialization caused it)
await runScenario({
  name: "2. WARMED UP (1 Request First, then 200 Connections)",
  warmup: true,
});

// Scenario 3: Cold start with Connection: close (identifies if TCP socket reuse caused it)
await runScenario({
  name: "3. COLD START (Connection: close, No Keep-Alive)",
  warmup: false,
  headers: { Connection: "close" },
});

console.log("\n============================================================");
console.log("Isolation Suite Completed.");
console.log("============================================================\n");
