#!/usr/bin/env node
/**
 * Diagnostic tool to determine the exact origin of timeouts.
 * Measures if timeouts happen at the boundary (+0s start / +10s cutoff)
 * or continuously during steady-state load.
 */
import path from "node:path";
import autocannon from "autocannon";
import { ROOT } from "./config.mjs";
import { startServer } from "./lib.mjs";

console.log("=== Diagnosing Dinou 9 Timeouts ===");
const cwd = path.join(ROOT, "apps/dinou-9");

const server = await startServer({
  cwd,
  cmd: "pnpm",
  args: ["run", "start"],
  port: 3103,
  readyPath: "/",
});

console.log("Server running. Log output:");
console.log(server.output().slice(-500));

async function runTest(label, headers = {}) {
  console.log(`\n--- Test: ${label} (200 connections, 10 seconds) ---`);
  const timestamps = [];
  const started = Date.now();

  await new Promise((resolve) => {
    const inst = autocannon(
      {
        url: `${server.url}/`,
        connections: 200,
        duration: 10,
        pipelining: 1,
        headers,
      },
      (err, result) => {
        const total = result.requests.total;
        const timeouts = result.timeouts;
        const errors = result.errors;
        console.log(`Finished: ${total} requests, ${timeouts} timeouts, ${errors} errors.`);
        resolve();
      }
    );

    inst.on("reqError", (err) => {
      const elapsed = ((Date.now() - started) / 1000).toFixed(2);
      timestamps.push(Number(elapsed));
      console.log(`  [+${elapsed}s] reqError: ${err.code || err.message}`);
    });
  });

  const startBorder = timestamps.filter((t) => t <= 2.0).length;
  const middle = timestamps.filter((t) => t > 2.0 && t < 8.0).length;
  const endBorder = timestamps.filter((t) => t >= 8.0).length;

  console.log(`Distribution of errors across timeline:`);
  console.log(`  Start border (0s - 2s)  : ${startBorder}`);
  console.log(`  Middle / Steady (2s - 8s): ${middle}`);
  console.log(`  End border (8s - 10s)   : ${endBorder}`);
}

try {
  // Test 1: Standard Keep-Alive
  await runTest("1. Standard Keep-Alive");

  // Test 2: Connection: close (no persistent connections)
  await runTest("2. Connection: close (No Keep-Alive)", { Connection: "close" });
} finally {
  await server.stop();
  console.log("\nServer stopped. Diagnostics complete.");
}
