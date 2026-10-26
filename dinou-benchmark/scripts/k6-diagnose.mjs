#!/usr/bin/env node
/**
 * Fully automated k6 diagnostic suite.
 * Runs 200 concurrent VUs for 15s using k6 (Go-based networking stack)
 * against Dinou 9 and Next.js 16 to verify if timeouts were purely an autocannon artifact.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { ROOT } from "./config.mjs";
import { startServer } from "./lib.mjs";

const k6Script = path.join(ROOT, "scripts", "k6-scenario.js");

async function testWithK6(framework, appDir, port) {
  console.log(`\n============================================================`);
  console.log(`K6 LOAD TEST: ${framework} (Port ${port})`);
  console.log(`200 Concurrent VUs for 15 seconds (Go HTTP Network Stack)`);
  console.log(`============================================================`);

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
        ["run", "--env", `TARGET_URL=http://127.0.0.1:${port}/`, k6Script],
        {
          stdio: "inherit",
          shell: true,
        }
      );
      child.on("close", resolve);
    });
  } finally {
    await server.stop();
    console.log(`Server stopped for ${framework}.`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

console.log("Starting K6 Independent Load Diagnostic...\n");
await testWithK6("Dinou 9.0.0", "apps/dinou-9", 3103);
await testWithK6("Next.js 16.4.2", "apps/next", 3102);

console.log("\n============================================================");
console.log("K6 Diagnostic Completed for both frameworks.");
console.log("============================================================\n");
