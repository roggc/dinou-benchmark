#!/usr/bin/env node
/**
 * Functional verification: checks that all apps behave identically and that
 * each rendering strategy performs as specified. This is the prerequisite gate
 * before any benchmark: if this fails, numbers are meaningless.
 *
 * Usage: node scripts/verify.mjs [--only=dinou] [--skip-build]
 */
import { cp, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { ROOT, setup } from "./config.mjs";
import { selectedFrameworks } from "./config.mjs";
import { startServer, timedFetch, writeJson, readJson, round } from "./lib.mjs";

const skipBuild = process.argv.includes("--skip-build");
const frameworks = selectedFrameworks();
const results = [];

async function resetMessages(app) {
  await cp(
    path.join(ROOT, "shared/data/messages.json"),
    path.join(ROOT, app.dir, "data/messages.json")
  );
}

async function check(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Date.now() - started, detail: detail ?? "" };
  } catch (error) {
    return { name, ok: false, ms: Date.now() - started, detail: error.message };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

for (const fw of frameworks) {
  console.log(`\n=== ${fw.name} ${fw.version} (${fw.dir}) ===`);
  const cwd = path.join(ROOT, fw.dir);

  if (!skipBuild) {
    const { runCommand } = await import("./lib.mjs");
    const build = await runCommand({
      cwd,
      cmd: "pnpm",
      args: ["run", "build"],
      timeoutMs: 900_000,
    });
    if (build.code !== 0) {
      console.error(build.stdout.slice(-3000), build.stderr.slice(-3000));
      throw new Error(`build failed for ${fw.name}`);
    }
    console.log(`build ok in ${round(build.ms / 1000, 1)} s`);
  }

  await resetMessages(fw);

  const server = await startServer({
    cwd,
    cmd: "pnpm",
    args: ["run", "start"],
    port: fw.port,
    readyPath: "/",
    timeoutMs: 180_000,
  });

  const base = server.url;
  const checks = [];
  const token = `ping-${fw.id}-${Date.now().toString(36)}`;

  checks.push(
    await check("ssg: / responds 200", async () => {
      const res = await timedFetch(`${base}/`);
      assert(res.status === 200, `status ${res.status}`);
      return `${round(res.totalMs)} ms`;
    })
  );

  checks.push(
    await check("ssg: / 50 items listing", async () => {
      const { body } = await timedFetch(`${base}/`);
      const n = countOccurrences(body, 'data-item-id="');
      assert(n === 50, `found ${n} items, expected 50`);
      return `${n} items`;
    })
  );

  checks.push(
    await check("ssg: stable HTML across requests", async () => {
      const runs = [];
      for (let i = 0; i < setup.thresholds.staticStabilityRuns; i += 1) {
        runs.push((await timedFetch(`${base}/`)).body);
      }
      assert(new Set(runs).size === 1, "HTML changes between requests");
      return `${runs.length} identical requests`;
    })
  );

  checks.push(
    await check("isr: /items/1 responds 200", async () => {
      const res = await timedFetch(`${base}/items/1`);
      assert(res.status === 200, `status ${res.status}`);
      return `${round(res.totalMs)} ms`;
    })
  );

  checks.push(
    await check("isr: cached and stable HTML", async () => {
      const a = await timedFetch(`${base}/items/1`);
      const b = await timedFetch(`${base}/items/1`);
      assert(a.body === b.body, "HTML changes within 60s window");
      assert(a.body.includes("data-testid=\"item-stamp\""), "missing render timestamp");
      return "2 identical requests";
    })
  );

  checks.push(
    await check("isr: prerendered route /items/42", async () => {
      const res = await timedFetch(`${base}/items/42`);
      assert(res.status === 200, `status ${res.status}`);
      assert(/Resource 042/.test(res.body), "does not contain item 42");
      return "correct content";
    })
  );

  checks.push(
    await check("404: nonexistent routes", async () => {
      const statuses = [];
      for (const p of setup.notFoundPaths) {
        const res = await timedFetch(`${base}${p}`);
        statuses.push(`${p}=${res.status}`);
        assert(res.status === 404, `${p} returned ${res.status}`);
      }
      return statuses.join(" ");
    })
  );

  checks.push(
    await check("dashboard: responds 200", async () => {
      const res = await timedFetch(`${base}/dashboard`);
      assert(res.status === 200, `status ${res.status}`);
      return `${round(res.totalMs)} ms`;
    })
  );

  checks.push(
    await check("dashboard: is dynamic (two requests differ)", async () => {
      const a = await timedFetch(`${base}/dashboard`);
      const b = await timedFetch(`${base}/dashboard`);
      assert(a.body !== b.body, "HTML is identical: response is being cached");
      return "different timestamps";
    })
  );

  checks.push(
    await check("dashboard: streams 3 holes after fallback", async () => {
      const res = await timedFetch(`${base}/dashboard`);
      const fallbacks = countOccurrences(res.body, "data-skeleton=");
      const holes = countOccurrences(res.body, "data-hole=");
      assert(fallbacks >= 3, `fallbacks ${fallbacks}`);
      assert(holes >= 3, `resolved holes ${holes}`);
      assert(res.totalMs >= setup.holeDelayMs * 0.7, `too fast: ${res.totalMs}`);
      return `${fallbacks} fallbacks · ${holes} holes · ${round(res.totalMs)} ms`;
    })
  );

  let pprFirst = 0;
  let pprTotal = 0;
  checks.push(
    await check("ppr: static shell in first chunk", async () => {
      const res = await timedFetch(`${base}/ppr`);
      pprFirst = res.firstChunkMs;
      pprTotal = res.totalMs;
      assert(res.status === 200, `status ${res.status}`);
      assert(res.body.includes("ppr-shell-stamp"), "shell does not include stamp");
      assert(
        res.firstChunkMs < setup.thresholds.pprShellMs,
        `first chunk in ${round(res.firstChunkMs)} ms (threshold ${setup.thresholds.pprShellMs})`
      );
      return `first chunk ${round(res.firstChunkMs, 2)} ms`;
    })
  );

  checks.push(
    await check("ppr: hole arrives later (streaming)", async () => {
      const first = (await timedFetch(`${base}/ppr`)).firstChunkMs;
      const res = await timedFetch(`${base}/ppr`);
      pprFirst = res.firstChunkMs;
      pprTotal = res.totalMs;
      assert(res.body.includes('data-hole="live quote"'), "hole was not resolved");
      assert(
        res.totalMs - res.firstChunkMs >= setup.thresholds.pprHoleMs,
        `hole too fast: ${round(res.totalMs - res.firstChunkMs)} ms after shell`
      );
      assert(first < setup.thresholds.pprShellMs, `slow shell: ${round(first)} ms`);
      return `shell ${round(res.firstChunkMs, 2)} ms · total ${round(res.totalMs, 2)} ms`;
    })
  );

  checks.push(
    await check("mutation: Server Function visible in browser", async () => {
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage();
        await page.goto(`${base}/messages`, { waitUntil: "networkidle" });
        await page.fill('input[name="body"]', token);
        await page.click('[data-testid="submit"]');
        await page.waitForSelector('[data-testid="feedback"]', { timeout: 15_000 });
        const feedback = await page.textContent('[data-testid="feedback"]');
        assert(feedback && feedback.includes("Saved"), `feedback: ${feedback}`);
        await page.reload({ waitUntil: "networkidle" });
        const html = await page.content();
        assert(html.includes(token), "message does not appear after reload");
        return "persisted and rendered";
      } finally {
        await browser.close();
      }
    })
  );

  await server.stop();

  const passed = checks.filter((c) => c.ok).length;
  console.log(`\n${passed}/${checks.length} checks OK`);
  for (const c of checks) {
    console.log(`  ${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }

  results.push({
    framework: fw.id,
    version: fw.version,
    at: new Date().toISOString(),
    passed,
    total: checks.length,
    checks,
    ppr: { shellMs: round(pprFirst, 2), totalMs: round(pprTotal, 2) },
  });
}

// Preserve results of frameworks not executed in this run.
const previousVerify = (await readJson(path.join(ROOT, "results", "verify.json"), [])) ?? [];
const mergedVerify = [
  ...previousVerify.filter((p) => !results.some((r) => r.framework === p.framework)),
  ...results,
];
await writeJson(path.join(ROOT, "results", "verify.json"), mergedVerify.sort((a, b) => a.framework.localeCompare(b.framework)));

const allPassed = results.every((r) => r.passed === r.total);
console.log(`\n${allPassed ? "VERIFY OK" : "VERIFY FAILED"} — results in results/verify.json`);
if (!allPassed) process.exitCode = 1;

