#!/usr/bin/env node
/**
 * Dev server cold start: time from `pnpm dev` until first 200 response on `/`.
 * Repeated N times and reports the median.
 */
import path from "node:path";
import { ROOT, selectedFrameworks } from "./config.mjs";
import { startServer, writeJson, round, median } from "./lib.mjs";

const frameworks = selectedFrameworks();
const runs = Number(process.env.DEV_RUNS || 3);
const results = [];

for (const fw of frameworks) {
  const cwd = path.join(ROOT, fw.dir);
  const samples = [];

  for (let i = 0; i < runs; i += 1) {
    const server = await startServer({
      cwd,
      cmd: "pnpm",
      args: ["run", "dev"],
      port: fw.port,
      readyPath: "/",
      timeoutMs: 240_000,
      env: { NODE_ENV: "development" },
    });
    samples.push(server.readyMs / 1000);
    await new Promise((r) => setTimeout(r, 500));
    await server.stop();
  }

  console.log(
    `${fw.name} ${fw.version}: dev cold start ${samples.map((s) => round(s, 2)).join(" / ")} s (median ${round(median(samples), 2)} s)`
  );
  results.push({
    framework: fw.id,
    version: fw.version,
    runs: samples.map((s) => round(s, 2)),
    medianSeconds: round(median(samples), 2),
    at: new Date().toISOString(),
  });
}

await writeJson(path.join(ROOT, "results", "dev-start.json"), results);

