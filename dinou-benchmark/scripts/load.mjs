#!/usr/bin/env node
/**
 * Carga con autocannon sobre el build de producción ya arrancado por este
 * script. Por ruta y framework: TTFB (muestreo secuencial), req/s y latencias.
 *
 * SIEMPRE producción: `pnpm build` + `pnpm start`, con warmup antes de medir.
 */
import path from "node:path";
import autocannon from "autocannon";
import { ROOT, routes, setup, selectedFrameworks } from "./config.mjs";
import { startServer, timedFetch, writeJson, readJson, round, median, percentile } from "./lib.mjs";

const frameworks = selectedFrameworks();
const results = [];

function runAutocannon(opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(opts, (error, result) => (error ? reject(error) : resolve(result)));
    instance.on("error", reject);
  });
}

function percentilesOf(latency) {
  return {
    p50: round(latency.p50 ?? latency.p75 ?? 0, 2),
    p95: round(latency.p95 ?? latency.p97_5 ?? latency.p99 ?? 0, 2),
    p99: round(latency.p99 ?? 0, 2),
  };
}

for (const fw of frameworks) {
  const cwd = path.join(ROOT, fw.dir);
  console.log(`\n=== carga: ${fw.name} ${fw.version} ===`);
  const server = await startServer({
    cwd,
    cmd: "pnpm",
    args: ["run", "start"],
    port: fw.port,
    readyPath: "/",
    timeoutMs: 180_000,
  });

  const perRoute = [];

  try {
    for (const route of routes) {
      const url = `${server.url}${route.path}`;

      // warmup
      await runAutocannon({
        url,
        connections: 10,
        duration: setup.load.warmupSeconds,
        pipelining: 1,
      });

      const ttfbSamples = [];
      for (let i = 0; i < 30; i += 1) {
        const res = await timedFetch(url);
        ttfbSamples.push(res.firstChunkMs);
      }

      const runs = [];
      for (let i = 0; i < setup.load.runs; i += 1) {
        const result = await runAutocannon({
          url,
          connections: setup.load.connections,
          duration: setup.load.durationSeconds,
          pipelining: 1,
        });
        runs.push({
          rps: result.requests.average,
          latency: percentilesOf(result.latency),
          errors: result.errors,
          non2xx: result.non2xx,
          timeouts: result.timeouts,
        });
      }

      const entry = {
        route: route.id,
        path: route.path,
        kind: route.kind,
        ttfbMs: {
          median: round(median(ttfbSamples), 2),
          p95: round(percentile(ttfbSamples, 95), 2),
        },
        rps: {
          median: round(median(runs.map((r) => r.rps)), 1),
          p95: round(percentile(runs.map((r) => r.rps), 95), 1),
        },
        latencyMs: {
          p50: round(median(runs.map((r) => r.latency.p50)), 2),
          p95: round(median(runs.map((r) => r.latency.p95)), 2),
          p99: round(median(runs.map((r) => r.latency.p99)), 2),
        },
        runs: runs.length,
        errors: runs.reduce((a, r) => a + r.errors + r.non2xx + r.timeouts, 0),
      };

      console.log(
        `  ${route.path.padEnd(12)} ttfb ${String(entry.ttfbMs.median).padStart(7)} ms · ${String(entry.rps.median).padStart(7)} req/s · p50 ${entry.latencyMs.p50} / p99 ${entry.latencyMs.p99} ms`
      );
      perRoute.push(entry);
    }
  } finally {
    await server.stop();
  }

  results.push({
    framework: fw.id,
    version: fw.version,
    connections: setup.load.connections,
    durationSeconds: setup.load.durationSeconds,
    runs: setup.load.runs,
    routes: perRoute,
    at: new Date().toISOString(),
    note: "autocannon no expone p95 exacto; se usa su p97.5 como cota superior.",
  });
}

// Conserva los resultados de frameworks que no se han ejecutado en esta pasada.
const previous = (await readJson(path.join(ROOT, "results", "load.json"), [])) ?? [];
const merged = [...previous.filter((p) => !results.some((r) => r.framework === p.framework)), ...results];
await writeJson(path.join(ROOT, "results", "load.json"), merged.sort((a, b) => a.framework.localeCompare(b.framework)));

