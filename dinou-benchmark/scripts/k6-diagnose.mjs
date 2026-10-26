#!/usr/bin/env node
/**
 * Advanced k6 diagnostic suite:
 * 1. 30-second duration to verify if max latency tracks test duration (connection starvation).
 * 2. Linux kernel TCP listen queue monitoring (TcpExtListenOverflows, TcpExtListenDrops, somaxconn).
 * 3. Tests both Dinou 9 and Next.js 16 with 200 concurrent VUs.
 */
import { execSync, spawn } from "node:child_process";
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

  try {
    await new Promise((resolve) => {
      const child = spawn(
        "k6",
        ["run", "--env", `DURATION=${duration}`, "--env", `TARGET_URL=http://127.0.0.1:${port}/`, k6Script],
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
  } finally {
    await server.stop();
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
