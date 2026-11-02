#!/usr/bin/env node
/**
 * Generates results/REPORT.md (or <dir>/REPORT.md via --dir=<dir>) from *.json and SVG vector charts.
 * Zero external dependencies: pure templates.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, routes, frameworks } from "./config.mjs";

const dirArg = process.argv.find((a) => a.startsWith("--dir="));
const targetDirName = dirArg ? dirArg.slice("--dir=".length) : "results";
const targetDir = path.join(ROOT, targetDirName);

async function readJson(name) {
  try {
    return JSON.parse(await readFile(path.join(targetDir, name), "utf8"));
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
const configuredIds = frameworks.map((f) => f.id);
const ids = configuredIds;
const labels = {
  "dinou-9": "Dinou 9.0.3",
  "dinou-9-u": "Dinou 9.0.3 (-u)",
  dinou: "Dinou 9.0.3",
  next: "Next.js 16.4.3",
};
const label = (id) => labels[id] ?? id;
const fmt = (n, digits = 1) => (n === undefined || n === null ? "—" : Number(n).toFixed(digits));

function stripBracketTag(detail = "") {
  return String(detail)
    .replace(/^\[[^\]]*\]\s*/, "")
    .replace(/<Link([^>]*)>/g, "`<Link$1>`")
    .trim();
}

function formatCheckStatus(check, fallbackRuns = 1) {
  const totalRuns = check.totalRuns ?? fallbackRuns;
  const passedRuns = check.passedRuns ?? (check.ok ? totalRuns : 0);
  const failedRuns = check.failedRuns ?? totalRuns - passedRuns;
  const cleanDetail = stripBracketTag(check.detail);

  if (check.ok) {
    return {
      badge: `✅ PASS (${passedRuns}/${totalRuns} passed)`,
      shortBadge: `✅ \`${passedRuns}/${totalRuns}\` PASS`,
      cleanDetail,
    };
  }
  if (check.flaky) {
    return {
      badge: `⚠️ FLAKY (${passedRuns}/${totalRuns} passed, ${failedRuns}/${totalRuns} failed)`,
      shortBadge: `⚠️ \`${passedRuns}/${totalRuns}\` FLAKY (\`${failedRuns}/${totalRuns}\` failed)`,
      cleanDetail,
    };
  }
  return {
    badge: `❌ FAIL (${passedRuns}/${totalRuns} passed, ${failedRuns}/${totalRuns} failed)`,
    shortBadge: `❌ \`${passedRuns}/${totalRuns}\` PASS (\`${failedRuns}/${totalRuns}\` failed)`,
    cleanDetail,
  };
}

const lines = [];
lines.push("# Benchmark Results: Dinou v9.0.3 vs. Next.js v16.4.3");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push(
  "> **Execution Environment.** Performance, build, startup, HMR, and memory figures in this report were recorded on a dedicated DigitalOcean CPU-Optimized droplet (**4 Dedicated Intel Xeon vCPUs / 8 GB RAM**, Ubuntu 24.04 LTS, provisioned via `infra/droplet-setup.sh`) across **`n = 5` independent passes** (`200` concurrent connections, `30s` per round, `5s` warmup). Functional and 3D Caching Cube verification (`36 checks × 10 runs = 360 executions`) is documented in [`report-verify.md`](../report-verify.md)."
);
lines.push("");

if (verify && verify.length > 0) {
  const runsPerCheck = verify[0]?.runs ?? 10;
  lines.push("## Functional & Rigorous 3D Caching Verification");
  lines.push("");
  lines.push(
    `| Framework | Version | Checks Passed (${runsPerCheck}/${runsPerCheck}) | Flaky Checks | Deterministic Failures (0/${runsPerCheck}) | Total Executions Passed | Status |`
  );
  lines.push("| --- | --- | :---: | :---: | :---: | :---: | :---: |");
  for (const entry of verify) {
    const runs = entry.runs ?? runsPerCheck;
    const totalChecks = entry.total ?? entry.checks.length;
    const passedChecks = entry.passed ?? entry.checks.filter((c) => c.ok).length;
    const flakyChecks = entry.flaky ?? entry.checks.filter((c) => c.flaky).length;
    const deterministicFailures = totalChecks - passedChecks - flakyChecks;
    const totalExecs = totalChecks * runs;
    const passedExecs = entry.checks.reduce(
      (sum, c) => sum + (c.passedRuns ?? (c.ok ? runs : 0)),
      0
    );
    const execPct = totalExecs > 0 ? ((passedExecs / totalExecs) * 100).toFixed(1) : "0.0";
    lines.push(
      `| ${label(entry.framework)} | \`${entry.version}\` | **${passedChecks}/${totalChecks}** | ${flakyChecks} | ${deterministicFailures} | \`${passedExecs}/${totalExecs}\` (\`${execPct}%\`) | ${passedChecks === totalChecks ? "✅" : "⚠️"} |`
    );
  }
  lines.push("");

  const failedOrFlaky = verify.flatMap((entry) =>
    entry.checks
      .map((c, idx) => ({ check: c, checkNum: idx + 1, entry }))
      .filter(({ check }) => !check.ok)
      .map(({ check, checkNum, entry: fwEntry }) => {
        const { badge, cleanDetail } = formatCheckStatus(check, fwEntry.runs ?? runsPerCheck);
        return `- **Check #${checkNum}** · ${label(fwEntry.framework)} → \`${check.name}\` — **${badge}**: ${cleanDetail}`;
      })
  );
  if (failedOrFlaky.length) {
    lines.push("### Failures & Flaky Checks Summary");
    lines.push("");
    lines.push(...failedOrFlaky);
    lines.push("");
  }

  // Full 36-Check Breakdown Table
  const verifyFrameworks = verify.map((entry) => entry.framework);
  const maxChecks = Math.max(...verify.map((entry) => entry.checks.length));
  lines.push(`### Complete ${maxChecks}-Check Verification Breakdown (\`#1\`–\`#${maxChecks}\`)`);
  lines.push("");
  lines.push(
    `| Check # | Verification Check | ${verifyFrameworks.map((fwId) => `${label(fwId)} Result & Detail`).join(" | ")} |`
  );
  lines.push(`| :---: | :--- | ${verifyFrameworks.map(() => ":---").join(" | ")} |`);
  for (let i = 0; i < maxChecks; i += 1) {
    const checkName = verify[0]?.checks[i]?.name ?? `Check #${i + 1}`;
    const cells = verify.map((entry) => {
      const c = entry.checks[i];
      if (!c) return "—";
      const { shortBadge, cleanDetail } = formatCheckStatus(c, entry.runs ?? runsPerCheck);
      const safeDetail = cleanDetail.replace(/\|/g, "\\|");
      return `${shortBadge}${safeDetail ? ` — ${safeDetail}` : ""}`;
    });
    lines.push(`| **#${i + 1}** | \`${checkName}\` | ${cells.join(" | ")} |`);
  }
  lines.push("");
}

if (load) {
  lines.push("## Production · TTFB, Throughput and Latency (Baseline + 7 Rigorous 3D Caching Suites)");
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
  row("HMR edit → DOM (ms, median)", (id) => fmt(byId(hmr, id)?.medianMs, 0));
  row("Client JS (KiB gzip)", (id) => fmt((byId(bundle, id)?.gzipBytes ?? 0) / 1024, 1));
  row("Client JS (KiB brotli)", (id) => fmt((byId(bundle, id)?.brotliBytes ?? 0) / 1024, 1));
  row("Idle RSS (MB, median)", (id) => fmt((byId(memory, id)?.idleBytes ?? 0) / 1e6, 1));
  row("Peak RSS under load (MB)", (id) => fmt((byId(memory, id)?.peakBytes ?? 0) / 1e6, 1));
  lines.push("");
  if ((memory ?? []).some((m) => m.reliable === false)) {
    lines.push(
      "> ⚠️ **RSS memory not reliable in this run.** The kernel was gVisor: `/proc/<pid>/status` does not account for memory per process and RAM figures appear inflated. In the dedicated droplet (standard Linux kernel), it is accurate."
    );
    lines.push("");
  }
}

await writeFile(path.join(targetDir, "REPORT.md"), lines.join("\n") + "\n", "utf8");

// --- SVG Charts (horizontal bars, zero external dependencies) ---
function barChart({ title, series, unit, width = 760 }) {
  const barH = 26;
  const gap = 12;
  const top = 54;
  const height = top + series.length * (barH + gap) + 24;
  const max = Math.max(...series.map((s) => s.value), 1);
  const left = 240;
  const usable = width - left - 90;
  const bars = series
    .map((s, i) => {
      const y = top + i * (barH + gap);
      const w = Math.max(2, (s.value / max) * usable);
      return `<text x="0" y="${y + 17}" font-family="ui-sans-serif" font-size="12" fill="#8d99a8">${s.label}</text>
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
  <text x="20" y="34" font-family="ui-sans-serif" font-size="16" fill="#e7ecf3">See ${targetDirName}/REPORT.md</text>
  ${chartElements.join("\n")}
</svg>`;

await writeFile(path.join(targetDir, "charts.svg"), index, "utf8");
for (const chart of charts) {
  await writeFile(path.join(targetDir, chart.name), chart.svg, "utf8");
}

console.log(`Wrote ${targetDirName}/REPORT.md and ${targetDirName}/charts.svg`);
