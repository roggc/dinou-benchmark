#!/usr/bin/env node
/**
 * Generates results/REPORT.md from results/*.json and SVG vector charts.
 * Zero external dependencies: pure templates.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, routes, frameworks } from "./config.mjs";

async function readJson(name) {
  try {
    return JSON.parse(await readFile(path.join(ROOT, "results", name), "utf8"));
  } catch {
    return null;
  }
}

const [verify, build, dev, hmr, bundle, load, memory] = await Promise.all([
  readJson("verify.json"),
  readJson("build.json"),
  readJson("dev-start.json"),
  readJson("hmr.json"),
  readJson("bundle.json"),
  readJson("load.json"),
  readJson("memory.json"),
]);

const byId = (list, id) => (list ?? []).find((entry) => entry.framework === id);
const ids = (load && load.length > 0) ? [...new Set(load.map((l) => l.framework))] : frameworks.map((f) => f.id);
const labels = {
  "dinou-8": "Dinou 8.1.2",
  "dinou-9": "Dinou 9.0.1",
  "dinou-9-u": "Dinou 9.0.1 (-u)",
  dinou: "Dinou",
  next: "Next.js 16.4.2",
};
const label = (id) => labels[id] ?? id;
const fmt = (n, digits = 1) => (n === undefined || n === null ? "—" : Number(n).toFixed(digits));

const lines = [];
lines.push("# Benchmark Results");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push(
  "> **Honesty Notice.** The numbers in this report were produced in a single-core shared sandbox environment, not on the dedicated cloud hardware described in `infra/`. They serve to verify that the benchmark harness functions properly, **not** to publish definitive comparisons. For publishable figures, run `pnpm bench` on the dedicated hardware indicated in the README (`infra/droplet-setup.sh`)."
);
lines.push("");

if (verify) {
  lines.push("## Functional Verification");
  lines.push("");
  lines.push("| Framework | Checks Passed | Status |");
  lines.push("| --- | --- | --- |");
  for (const entry of verify) {
    lines.push(
      `| ${label(entry.framework)} | ${entry.passed}/${entry.total} | ${entry.passed === entry.total ? "✅" : "⚠️"} |`
    );
  }
  lines.push("");
  const failed = verify.flatMap((entry) =>
    entry.checks.filter((c) => !c.ok).map((c) => `- ${label(entry.framework)} → ${c.name}: ${c.detail}`)
  );
  if (failed.length) {
    lines.push("Failures:");
    lines.push("");
    lines.push(...failed);
    lines.push("");
  }
}

if (load) {
  lines.push("## Production · TTFB, Throughput and Latency");
  lines.push("");
  lines.push("| Route | Type | Framework | TTFB p50 (ms) | TTFB p95 (ms) | req/s | p50 (ms) | p99 (ms) | Errors |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const route of routes) {
    for (const id of ids) {
      const entry = byId(load, id)?.routes?.find((r) => r.route === route.id);
      if (!entry) continue;
      const errText =
        (entry.errors ?? 0) === 0
          ? "0 (0%)"
          : `${entry.errors}${entry.errorRatePct !== undefined ? ` (${entry.errorRatePct}%)` : ""}${entry.timeouts > 0 ? ` · ${entry.timeouts} to` : ""}`;
      lines.push(
        `| \`${route.path}\` | ${route.kind} | ${label(id)} | ${fmt(entry.ttfbMs.median, 2)} | ${fmt(entry.ttfbMs.p95, 2)} | ${fmt(entry.rps.median, 1)} | ${fmt(entry.latencyMs.p50, 2)} | ${fmt(entry.latencyMs.p99, 2)} | ${errText} |`
      );
    }
  }
  lines.push("");
  lines.push(
    `Load test: ${load[0]?.connections ?? "—"} connections, ${load[0]?.durationSeconds ?? "—"} s per round, ${load[0]?.runs ?? "—"} rounds, median across rounds. autocannon does not expose exact p95; p97.5 is used as an upper bound.`
  );
  lines.push("");
}

if (build || dev || hmr || bundle || memory) {
  lines.push("## Build, Startup, HMR, Bundle and Memory");
  lines.push("");
  lines.push("| Metric | " + ids.map(label).join(" | ") + " |");
  lines.push("| --- | " + ids.map(() => "---").join(" | ") + " |");
  const row = (name, fn) => {
    lines.push(`| ${name} | ` + ids.map((id) => fn(id)).join(" | ") + " |");
  };
  row("Production build (s, median)", (id) => fmt(byId(build, id)?.medianSeconds, 2));
  row("Output size (MB)", (id) => fmt((byId(build, id)?.outputBytes ?? 0) / 1e6, 1));
  row("Dev cold start (s, median)", (id) => fmt(byId(dev, id)?.medianSeconds, 2));
  row("HMR edit → DOM (ms)", (id) => fmt(byId(hmr, id)?.medianMs, 0));
  row("Client JS (KiB gzip)", (id) => fmt((byId(bundle, id)?.gzipBytes ?? 0) / 1024, 1));
  row("Client JS (KiB brotli)", (id) => fmt((byId(bundle, id)?.brotliBytes ?? 0) / 1024, 1));
  row("Idle RSS (MB)", (id) => fmt((byId(memory, id)?.idleBytes ?? 0) / 1e6, 1));
  row("Peak RSS under load (MB)", (id) => fmt((byId(memory, id)?.peakBytes ?? 0) / 1e6, 1));
  lines.push("");
  if ((memory ?? []).some((m) => m.reliable === false)) {
    lines.push(
      "> ⚠️ **RSS memory not reliable in this run.** The kernel was gVisor: `/proc/<pid>/status` does not account for memory per process and RAM figures appear inflated. In the dedicated droplet (standard Linux kernel), it is accurate."
    );
    lines.push("");
  }
}

await writeFile(path.join(ROOT, "results", "REPORT.md"), lines.join("\n") + "\n", "utf8");

// --- SVG Charts (horizontal bars, zero external dependencies) ---
function barChart({ title, series, unit, width = 760 }) {
  const barH = 26;
  const gap = 12;
  const top = 54;
  const height = top + series.length * (barH + gap) + 24;
  const max = Math.max(...series.map((s) => s.value), 1);
  const left = 200;
  const usable = width - left - 90;
  const bars = series
    .map((s, i) => {
      const y = top + i * (barH + gap);
      const w = Math.max(2, (s.value / max) * usable);
      return `<text x="0" y="${y + 17}" font-family="ui-sans-serif" font-size="13" fill="#8d99a8">${s.label}</text>
  <rect x="${left}" y="${y}" width="${w}" height="${barH}" rx="5" fill="${s.color || "#6ee7b7"}" opacity="0.9"/>
  <text x="${left + w + 8}" y="${y + 17}" font-family="ui-monospace" font-size="12" fill="#e7ecf3">${s.value.toFixed(1)} ${unit}</text>`;
    })
    .join("\n  ");
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0b0d10"/>
  <text x="0" y="26" font-family="ui-sans-serif" font-size="15" font-weight="600" fill="#e7ecf3">${title}</text>
  ${bars}
</svg>`,
    height,
  };
}

const colors = {
  "dinou-8": "#6ee7b7",
  "dinou-9": "#10b981",
  "dinou-9-u": "#059669",
  dinou: "#6ee7b7",
  next: "#7dd3fc",
};
const charts = [];

if (load) {
  const series = [];
  for (const route of routes) {
    for (const id of ids) {
      const entry = byId(load, id)?.routes?.find((r) => r.route === route.id);
      if (entry) series.push({ label: `${route.path} · ${id}`, value: entry.ttfbMs.median, color: colors[id] });
    }
  }
  if (series.length) {
    const chart = barChart({ title: "TTFB median by route (ms, lower is better)", series, unit: "ms" });
    charts.push({ name: "ttfb.svg", ...chart });
  }
}

if (bundle) {
  const series = ids.map((id) => ({ label: label(id), value: (byId(bundle, id)?.gzipBytes ?? 0) / 1024, color: colors[id] }));
  const chart = barChart({ title: "Client JavaScript (KiB gzip, lower is better)", series, unit: "KiB" });
  charts.push({ name: "bundle.svg", ...chart });
}

let currentY = 60;
const chartElements = [];
for (const chart of charts) {
  chartElements.push(`<g transform="translate(20,${currentY})">${chart.svg}</g>`);
  currentY += chart.height + 40;
}
const totalHeight = currentY + 20;

const index = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${totalHeight}">
  <rect width="100%" height="100%" fill="#0b0d10"/>
  <text x="20" y="34" font-family="ui-sans-serif" font-size="16" fill="#e7ecf3">See results/REPORT.md</text>
  ${chartElements.join("\n")}
</svg>`;

await writeFile(path.join(ROOT, "results", "charts.svg"), index, "utf8");
for (const chart of charts) {
  await writeFile(path.join(ROOT, "results", chart.name), chart.svg, "utf8");
}

console.log("Wrote results/REPORT.md and results/charts.svg");
