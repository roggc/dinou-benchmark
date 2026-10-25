#!/usr/bin/env node
/** Measures production build: wall clock time and output directory size. */
import { rm, stat } from "node:fs/promises";
import path from "node:path";
import { ROOT, selectedFrameworks } from "./config.mjs";
import { runCommand, writeJson, round, median } from "./lib.mjs";

const frameworks = selectedFrameworks();
const runs = Number(process.env.BUILD_RUNS || 2);
const results = [];

async function dirSize(dir) {
  let total = 0;
  const { readdir } = await import("node:fs/promises");
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += await dirSize(full);
    else total += (await stat(full)).size;
  }
  return total;
}

for (const fw of frameworks) {
  const cwd = path.join(ROOT, fw.dir);
  const times = [];
  let size = 0;
  let sizePerDir = {};

  for (let i = 0; i < runs; i += 1) {
    for (const out of fw.outputDirs) await rm(path.join(cwd, out), { recursive: true, force: true });
    if (process.platform === "win32") await new Promise((r) => setTimeout(r, 400));

    const run = await runCommand({ cwd, cmd: "pnpm", args: ["run", "build"], timeoutMs: 900_000 });
    if (run.code !== 0) {
      console.error(run.stdout.slice(-2500), run.stderr.slice(-2500));
      throw new Error(`build failed: ${fw.name} ${fw.version}`);
    }
    times.push(run.ms / 1000);
  }

  sizePerDir = {};
  for (const out of fw.outputDirs) {
    sizePerDir[out] = await dirSize(path.join(cwd, out));
    size += sizePerDir[out];
  }

  console.log(`${fw.name} ${fw.version}: build ${times.map((t) => round(t, 1)).join(" / ")} s · output ${round(size / 1e6, 1)} MB`);
  results.push({
    framework: fw.id,
    version: fw.version,
    runs: times.map((t) => round(t, 2)),
    medianSeconds: round(median(times), 2),
    outputBytes: size,
    outputBytesByDir: sizePerDir,
    at: new Date().toISOString(),
  });
}

await writeJson(path.join(ROOT, "results", "build.json"), results);

