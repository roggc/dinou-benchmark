#!/usr/bin/env node
/**
 * Genera results/REPORT.md a partir de los JSON de results/ y un SVG con las
 * gráficas comparativas. Sin dependencias: solo plantillas.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, routes } from "./config.mjs";

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
const ids = [...new Set((load ?? []).map((l) => l.framework))];
const labels = {
  "dinou-8": "Dinou 8.1.1",
  "dinou-9": "Dinou 9.0.0",
  dinou: "Dinou",
  next: "Next.js 16.4.2",
};
const label = (id) => labels[id] ?? id;
const fmt = (n, digits = 1) => (n === undefined || n === null ? "—" : Number(n).toFixed(digits));

const lines = [];
lines.push("# Resultados del benchmark");
lines.push("");
lines.push(`Generado: ${new Date().toISOString()}`);
lines.push("");
lines.push(
  "> **Aviso de honestidad.** Los números de este informe se han producido en una máquina compartida de un solo núcleo (sandbox), no en el droplet descrito en `infra/`. Sirven para comprobar que el arnés funciona, **no** para publicar comparativas. Para cifras publicables, ejecuta `pnpm bench` en el hardware indicado en el README (`infra/droplet-setup.sh`)."
);
lines.push("");

if (verify) {
  lines.push("## Verificación funcional");
  lines.push("");
  lines.push("| Framework | Comprobaciones | Estado |");
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
    lines.push("Fallos:");
    lines.push("");
    lines.push(...failed);
    lines.push("");
  }
}

if (load) {
  lines.push("## Producción · TTFB, throughput y latencia");
  lines.push("");
  lines.push("| Ruta | Tipo | Framework | TTFB p50 (ms) | TTFB p95 (ms) | req/s | p50 (ms) | p99 (ms) |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const route of routes) {
    for (const id of ids) {
      const entry = byId(load, id)?.routes?.find((r) => r.route === route.id);
      if (!entry) continue;
      lines.push(
        `| \`${route.path}\` | ${route.kind} | ${label(id)} | ${fmt(entry.ttfbMs.median, 2)} | ${fmt(entry.ttfbMs.p95, 2)} | ${fmt(entry.rps.median, 1)} | ${fmt(entry.latencyMs.p50, 2)} | ${fmt(entry.latencyMs.p99, 2)} |`
      );
    }
  }
  lines.push("");
  lines.push(
    `Carga: ${load[0]?.connections ?? "—"} conexiones, ${load[0]?.durationSeconds ?? "—"} s por ronda, ${load[0]?.runs ?? "—"} rondas, mediana entre rondas. autocannon no expone p95 exacto; se usa su p97.5 como cota superior.`
  );
  lines.push("");
}

if (build || dev || hmr || bundle || memory) {
  lines.push("## Build, arranque, HMR, bundle y memoria");
  lines.push("");
  lines.push("| Métrica | " + ids.map(label).join(" | ") + " |");
  lines.push("| --- | " + ids.map(() => "---").join(" | ") + " |");
  const row = (name, fn) => {
    lines.push(`| ${name} | ` + ids.map((id) => fn(id)).join(" | ") + " |");
  };
  row("Build de producción (s, mediana)", (id) => fmt(byId(build, id)?.medianSeconds, 2));
  row("Tamaño de salida (MB)", (id) => fmt((byId(build, id)?.outputBytes ?? 0) / 1e6, 1));
  row("Dev cold start (s, mediana)", (id) => fmt(byId(dev, id)?.medianSeconds, 2));
  row("HMR edición → DOM (ms)", (id) => fmt(byId(hmr, id)?.medianMs, 0));
  row("JS de cliente (KiB gzip)", (id) => fmt((byId(bundle, id)?.gzipBytes ?? 0) / 1024, 1));
  row("JS de cliente (KiB brotli)", (id) => fmt((byId(bundle, id)?.brotliBytes ?? 0) / 1024, 1));
  row("RSS en reposo (MB)", (id) => fmt((byId(memory, id)?.idleBytes ?? 0) / 1e6, 1));
  row("RSS pico bajo carga (MB)", (id) => fmt((byId(memory, id)?.peakBytes ?? 0) / 1e6, 1));
  lines.push("");
  if ((memory ?? []).some((m) => m.reliable === false)) {
    lines.push(
      "> ⚠️ **RSS no fiable en esta ejecución.** El kernel era gVisor: `/proc/<pid>/status` no contabiliza la memoria por proceso y las cifras de RAM están infladas. La columna se mantiene para que el formato del informe sea el mismo, pero ignórala. En el droplet (kernel Linux normal) sí es válida."
    );
    lines.push("");
  }
}

await writeFile(path.join(ROOT, "results", "REPORT.md"), lines.join("\n") + "\n", "utf8");

// --- gráficas SVG (barras horizontales, sin dependencias) ---
function barChart({ title, series, unit, width = 720 }) {
  const barH = 26;
  const gap = 12;
  const top = 54;
  const height = top + series.length * (barH + gap) + 24;
  const max = Math.max(...series.map((s) => s.value), 1);
  const left = 190;
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0b0d10"/>
  <text x="0" y="26" font-family="ui-sans-serif" font-size="15" font-weight="600" fill="#e7ecf3">${title}</text>
  ${bars}
</svg>`;
}

const colors = {
  "dinou-8": "#6ee7b7",
  "dinou-9": "#10b981",
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
  if (series.length) charts.push({ name: "ttfb.svg", svg: barChart({ title: "TTFB mediana por ruta (ms, menor es mejor)", series, unit: "ms" }) });
}

if (bundle) {
  const series = ids.map((id) => ({ label: label(id), value: (byId(bundle, id)?.gzipBytes ?? 0) / 1024, color: colors[id] }));
  charts.push({ name: "bundle.svg", svg: barChart({ title: "JavaScript de cliente (KiB gzip, menor es mejor)", series, unit: "KiB" }) });
}

const index = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="${charts.length * 260 + 60}">
  <rect width="100%" height="100%" fill="#0b0d10"/>
  <text x="20" y="34" font-family="ui-sans-serif" font-size="16" fill="#e7ecf3">Ver results/REPORT.md</text>
  ${charts
    .map((c, i) => `<g transform="translate(20,${60 + i * 260})">${c.svg}</g>`)
    .join("\n")}
</svg>`;

await writeFile(path.join(ROOT, "results", "charts.svg"), index, "utf8");
for (const chart of charts) {
  await writeFile(path.join(ROOT, "results", chart.name), chart.svg, "utf8");
}

console.log("Escrito results/REPORT.md y results/charts.svg");

