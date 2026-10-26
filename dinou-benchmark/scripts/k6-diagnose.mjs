#!/usr/bin/env node
/**
 * Advanced k6 diagnostic suite:
 * 1. 30-second duration to verify if max latency tracks test duration (connection starvation).
 * 2. Linux kernel TCP listen queue monitoring (TcpExtListenOverflows, TcpExtListenDrops, somaxconn).
 * 3. Server-side internal request duration measurement (measures if Node/Dinou took 14s or if it was network).
 * 4. k6 JSON output streaming parser to find exact start timestamps and buckets of slow requests (> 1s).
 */
import { execSync, spawn } from "node:child_process";
import { createReadStream, rmSync, existsSync, mkdirSync } from "node:fs";
import readline from "node:readline";
import path from "node:path";
import { ROOT } from "./config.mjs";
import { startServer } from "./lib.mjs";

const k6Script = path.join(ROOT, "scripts", "k6-scenario.js");
const duration = process.env.DURATION || "30s";

function getKernelStats() {
  if (process.platform !== "linux") return null;
  try {
    const somaxconn = execSync("cat /proc/sys/net/core/somaxconn", { encoding: "utf8" }).trim();
    const nstat = execSync("nstat -az TcpExtListenOverflows TcpExtListenDrops", { encoding: "utf8" }).trim();
    return { somaxconn, nstat };
  } catch {
    return null;
  }
}

async function analyzeSlowRequestsInK6Json(jsonFile, testStartedAt) {
  if (!existsSync(jsonFile)) {
    console.log(`\n[k6 Analysis] JSON log file not found: ${jsonFile}`);
    return;
  }

  let totalRequests = 0;
  let minStartedAt = Infinity;
  const slowRequests = [];

  const fileStream = createReadStream(jsonFile);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line.includes('"metric":"http_req_duration"')) continue;
    try {
      const obj = JSON.parse(line);
      const durationMs = obj.data?.value;
      if (typeof durationMs === "number") {
        totalRequests++;
        const finishedAt = new Date(obj.data.time).getTime();
        const startedAt = finishedAt - durationMs;
        if (startedAt < minStartedAt) minStartedAt = startedAt;

        if (durationMs > 1000) {
          slowRequests.push({
            durationMs,
            startedAt,
            finishedAt,
            status: obj.data.tags?.status || "—",
            url: obj.data.tags?.url || "—",
          });
        }
      }
    } catch {}
  }

  const baseTime = minStartedAt !== Infinity ? minStartedAt : testStartedAt;

  console.log(`\n------------------------------------------------------------`);
  console.log(`k6 SLOW REQUESTS & START TIMESTAMP ANALYSIS`);
  console.log(`------------------------------------------------------------`);
  console.log(`Total HTTP requests evaluated: ${totalRequests}`);

  if (slowRequests.length === 0) {
    console.log(`✓ Zero requests took longer than 1,000 ms (1.0s)!`);
    return;
  }

  console.log(
    `Total requests taking > 1.0s: ${slowRequests.length} (${((slowRequests.length / totalRequests) * 100).toFixed(2)}%)`
  );

  // Bucket slow requests by when they were sent
  const buckets = [
    { label: "Burst Window  [0.0s - 1.0s] ", min: 0, max: 1, count: 0, maxDur: 0 },
    { label: "Steady Window [1.0s - 5.0s] ", min: 1, max: 5, count: 0, maxDur: 0 },
    { label: "Steady Window [5.0s - 15.0s]", min: 5, max: 15, count: 0, maxDur: 0 },
    { label: "Steady Window [15.0s - 30.0s]", min: 15, max: 30, count: 0, maxDur: 0 },
    { label: "Wrap-up Window [> 30.0s]     ", min: 30, max: Infinity, count: 0, maxDur: 0 },
  ];

  for (const r of slowRequests) {
    const relSec = Math.max(0, (r.startedAt - baseTime) / 1000);
    r.relSec = relSec;
    const bucket = buckets.find((b) => relSec >= b.min && relSec < b.max) || buckets[buckets.length - 1];
    bucket.count++;
    if (r.durationMs > bucket.maxDur) bucket.maxDur = r.durationMs;
  }

  console.log(`\nBreakdown of slow requests (> 1.0s) by dispatch timestamp:`);
  for (const b of buckets) {
    if (b.count > 0) {
      console.log(
        `  → ${b.label}: ${b.count.toString().padStart(4, " ")} slow requests | Max duration: ${(b.maxDur / 1000).toFixed(2)}s`
      );
    } else {
      console.log(`  → ${b.label}:    0 slow requests`);
    }
  }

  console.log(`\nTop slowest individual requests:`);
  slowRequests.sort((a, b) => b.durationMs - a.durationMs);
  for (const r of slowRequests.slice(0, 10)) {
    console.log(
      `  - Duration: ${(r.durationMs / 1000).toFixed(2).padStart(5, " ")}s | Sent at: +${r.relSec.toFixed(3)}s into test | Status: ${r.status}`
    );
  }
  if (slowRequests.length > 10) {
    console.log(`  ... and ${slowRequests.length - 10} more.`);
  }
}

async function testWithK6(framework, appDir, port) {
  console.log(`\n============================================================`);
  console.log(`K6 LOAD TEST: ${framework} (Port ${port})`);
  console.log(`200 Concurrent VUs for ${duration} (Go HTTP Network Stack)`);
  console.log(`============================================================`);

  const beforeStats = getKernelStats();
  if (beforeStats) {
    console.log(`→ [Linux Kernel] somaxconn: ${beforeStats.somaxconn}`);
    console.log(`→ [Linux Kernel] TCP queue stats BEFORE test:\n${beforeStats.nstat}`);
  }

  const server = await startServer({
    cwd: path.join(ROOT, appDir),
    cmd: "pnpm",
    args: ["run", "start"],
    port,
    readyPath: "/",
  });

  const resultsDir = path.join(ROOT, "results");
  if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

  const jsonOut = path.join(resultsDir, `k6-${port}.json`);
  if (existsSync(jsonOut)) rmSync(jsonOut, { force: true });

  // Reset server stats if endpoint exists
  try {
    await fetch(`http://127.0.0.1:${port}/__reset_stats`);
  } catch {}

  const testStartedAt = Date.now();

  try {
    await new Promise((resolve) => {
      const child = spawn(
        "k6",
        [
          "run",
          "--env",
          `DURATION=${duration}`,
          "--env",
          `TARGET_URL=http://127.0.0.1:${port}/`,
          "--out",
          `json=${jsonOut}`,
          k6Script,
        ],
        {
          stdio: "inherit",
          shell: true,
        }
      );
      child.on("close", resolve);
    });

    const afterStats = getKernelStats();
    if (afterStats) {
      console.log(`\n→ [Linux Kernel] TCP queue stats AFTER test:\n${afterStats.nstat}`);
    }

    // Query internal server stats (if framework instruments /__stats)
    try {
      const statsRes = await fetch(`http://127.0.0.1:${port}/__stats`);
      if (statsRes.ok) {
        const contentType = statsRes.headers.get("content-type") || "";
        if (contentType.includes("json")) {
          const stats = await statsRes.json();
          console.log(`\n--- Internal Server Duration Metrics (${framework}) ---`);
          console.log(`  Total requests received by server : ${stats.received}`);
          console.log(`  Total responses finished by server: ${stats.finished}`);
          console.log(`  In-flight remaining               : ${stats.inFlight}`);
          console.log(`  Max internal request duration     : ${stats.maxDurationMs} ms`);
          console.log(`  Average internal request duration : ${stats.avgDurationMs} ms`);
          console.log(`  Requests taking > 1s in server    : ${stats.slowOver1s}`);
          if (stats.topSlowInsideNode && stats.topSlowInsideNode.length > 0) {
            console.log(`  Slowest requests recorded inside Node:`);
            for (const item of stats.topSlowInsideNode) {
              console.log(`    - ${item.durationMs} ms (${item.url})`);
            }
          } else {
            console.log(`  Slowest requests recorded inside Node: none exceeded 100 ms!`);
          }
        }
      }
    } catch {
      // Framework does not implement /__stats (e.g. Next.js)
    }

    // Analyze slow requests from k6 JSON
    await analyzeSlowRequestsInK6Json(jsonOut, testStartedAt);
  } finally {
    await server.stop();
    if (existsSync(jsonOut)) rmSync(jsonOut, { force: true });
    console.log(`Server stopped for ${framework}.`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

console.log(`Starting Advanced K6 + Kernel Diagnostic Suite (Duration: ${duration})...\n`);
await testWithK6("Dinou 9.0.0", "apps/dinou-9", 3103);
await testWithK6("Next.js 16.4.2", "apps/next", 3102);

console.log("\n============================================================");
console.log("Advanced Diagnostic Completed for both frameworks.");
console.log("============================================================\n");
