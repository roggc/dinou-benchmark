#!/usr/bin/env node
/**
 * Orchestrator: `pnpm bench` runs the entire pipeline in order and finishes
 * by generating results/REPORT.md.
 *
 * Phases: build → verify → bundle → dev-start → hmr → load → memory → report
 * Phases can be skipped with --skip=hmr,load or filtered with
 * --only-steps=verify,load.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { ROOT } from "./config.mjs";

const STEPS = [
  ["build", "scripts/build.mjs"],
  ["verify", "scripts/verify.mjs"],
  ["bundle", "scripts/bundle.mjs"],
  ["dev-start", "scripts/dev-start.mjs"],
  ["hmr", "scripts/hmr.mjs"],
  ["load", "scripts/load.mjs"],
  ["memory", "scripts/memory.mjs"],
  ["report", "scripts/report.mjs"],
];

const args = process.argv.slice(2);
const skipFlag = args.find((a) => a.startsWith("--skip="));
const onlyFlag = args.find((a) => a.startsWith("--only-steps="));
const skip = skipFlag ? skipFlag.split("=")[1].split(",") : [];
const only = onlyFlag ? onlyFlag.split("=")[1].split(",") : null;
const passThrough = args.filter((a) => a.startsWith("--only="));

function run(step) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, step[1]), ...passThrough], {
      cwd: ROOT,
      stdio: "inherit",
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

const started = Date.now();
for (const step of STEPS) {
  if (skip.includes(step[0])) {
    console.log(`\n— ${step[0]} (skipped)`);
    continue;
  }
  if (only && !only.includes(step[0]) && step[0] !== "report") continue;
  console.log(`\n▶ ${step[0]}`);
  const code = await run(step);
  if (code !== 0 && step[0] !== "verify") {
    console.error(`\n✗ ${step[0]} failed (exit code ${code}). Pipeline stopped.`);
    process.exit(code);
  }
  if (code !== 0) console.warn(`\n⚠ ${step[0]} completed with failures; continuing to collect remaining metrics.`);
}

console.log(`\nFull pipeline completed in ${Math.round((Date.now() - started) / 1000)} s. Report: results/REPORT.md`);
