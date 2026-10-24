#!/usr/bin/env node
/**
 * Verificación funcional: comprueba que las dos apps se comportan igual y que
 * cada estrategia de renderizado hace lo que dice. Es la puerta previa a
 * cualquier medición: si esto falla, los números no significan nada.
 *
 * Uso: node scripts/verify.mjs [--only=dinou] [--skip-build]
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
      throw new Error(`build falló para ${fw.name}`);
    }
    console.log(`build ok en ${round(build.ms / 1000, 1)} s`);
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
    await check("ssg: / responde 200", async () => {
      const res = await timedFetch(`${base}/`);
      assert(res.status === 200, `status ${res.status}`);
      return `${round(res.totalMs)} ms`;
    })
  );

  checks.push(
    await check("ssg: / listado de 50 items", async () => {
      const { body } = await timedFetch(`${base}/`);
      const n = countOccurrences(body, 'data-item-id="');
      assert(n === 50, `encontrados ${n} items, esperados 50`);
      return `${n} items`;
    })
  );

  checks.push(
    await check("ssg: HTML estable entre peticiones", async () => {
      const runs = [];
      for (let i = 0; i < setup.thresholds.staticStabilityRuns; i += 1) {
        runs.push((await timedFetch(`${base}/`)).body);
      }
      assert(new Set(runs).size === 1, "el HTML cambia entre peticiones");
      return `${runs.length} peticiones idénticas`;
    })
  );

  checks.push(
    await check("isr: /items/1 responde 200", async () => {
      const res = await timedFetch(`${base}/items/1`);
      assert(res.status === 200, `status ${res.status}`);
      return `${round(res.totalMs)} ms`;
    })
  );

  checks.push(
    await check("isr: HTML cacheado y estable", async () => {
      const a = await timedFetch(`${base}/items/1`);
      const b = await timedFetch(`${base}/items/1`);
      assert(a.body === b.body, "el HTML cambia dentro de la ventana de 60 s");
      assert(a.body.includes("data-testid=\"item-stamp\""), "sin marca de render");
      return "2 peticiones idénticas";
    })
  );

  checks.push(
    await check("isr: ruta prerenderizada /items/42", async () => {
      const res = await timedFetch(`${base}/items/42`);
      assert(res.status === 200, `status ${res.status}`);
      assert(/Recurso 042/.test(res.body), "no contiene el item 42");
      return "contenido correcto";
    })
  );

  checks.push(
    await check("404: rutas inexistentes", async () => {
      const statuses = [];
      for (const p of setup.notFoundPaths) {
        const res = await timedFetch(`${base}${p}`);
        statuses.push(`${p}=${res.status}`);
        assert(res.status === 404, `${p} devolvió ${res.status}`);
      }
      return statuses.join(" ");
    })
  );

  checks.push(
    await check("dashboard: responde 200", async () => {
      const res = await timedFetch(`${base}/dashboard`);
      assert(res.status === 200, `status ${res.status}`);
      return `${round(res.totalMs)} ms`;
    })
  );

  checks.push(
    await check("dashboard: es dinámico (dos peticiones difieren)", async () => {
      const a = await timedFetch(`${base}/dashboard`);
      const b = await timedFetch(`${base}/dashboard`);
      assert(a.body !== b.body, "el HTML es idéntico: se está cacheando");
      return "marcas de tiempo distintas";
    })
  );

  checks.push(
    await check("dashboard: streamea los 3 huecos tras el fallback", async () => {
      const res = await timedFetch(`${base}/dashboard`);
      const fallbacks = countOccurrences(res.body, "data-skeleton=");
      const holes = countOccurrences(res.body, "data-hole=");
      assert(fallbacks >= 3, `fallbacks ${fallbacks}`);
      assert(holes >= 3, `huecos resueltos ${holes}`);
      assert(res.totalMs >= setup.holeDelayMs * 0.7, `demasiado rápido: ${res.totalMs}`);
      return `${fallbacks} fallbacks · ${holes} huecos · ${round(res.totalMs)} ms`;
    })
  );

  let pprFirst = 0;
  let pprTotal = 0;
  checks.push(
    await check("ppr: shell estático en el primer chunk", async () => {
      const res = await timedFetch(`${base}/ppr`);
      pprFirst = res.firstChunkMs;
      pprTotal = res.totalMs;
      assert(res.status === 200, `status ${res.status}`);
      assert(res.body.includes("ppr-shell-stamp"), "el shell no incluye su marca");
      assert(
        res.firstChunkMs < setup.thresholds.pprShellMs,
        `primer chunk en ${round(res.firstChunkMs)} ms (umbral ${setup.thresholds.pprShellMs})`
      );
      return `primer chunk ${round(res.firstChunkMs, 2)} ms`;
    })
  );

  checks.push(
    await check("ppr: el hueco llega después (streaming)", async () => {
      const first = (await timedFetch(`${base}/ppr`)).firstChunkMs;
      const res = await timedFetch(`${base}/ppr`);
      pprFirst = res.firstChunkMs;
      pprTotal = res.totalMs;
      assert(res.body.includes('data-hole="cotización'), "el hueco no se resolvió");
      assert(
        res.totalMs - res.firstChunkMs >= setup.thresholds.pprHoleMs,
        `hueco demasiado rápido: ${round(res.totalMs - res.firstChunkMs)} ms tras el shell`
      );
      assert(first < setup.thresholds.pprShellMs, `shell lento: ${round(first)} ms`);
      return `shell ${round(res.firstChunkMs, 2)} ms · total ${round(res.totalMs, 2)} ms`;
    })
  );

  checks.push(
    await check("mutación: Server Function visible en el navegador", async () => {
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage();
        await page.goto(`${base}/messages`, { waitUntil: "networkidle" });
        await page.fill('input[name="body"]', token);
        await page.click('[data-testid="submit"]');
        await page.waitForSelector('[data-testid="feedback"]', { timeout: 15_000 });
        const feedback = await page.textContent('[data-testid="feedback"]');
        assert(feedback && feedback.includes("Guardado"), `feedback: ${feedback}`);
        await page.reload({ waitUntil: "networkidle" });
        const html = await page.content();
        assert(html.includes(token), "el mensaje no aparece tras recargar");
        return "persistido y renderizado";
      } finally {
        await browser.close();
      }
    })
  );

  await server.stop();

  const passed = checks.filter((c) => c.ok).length;
  console.log(`\n${passed}/${checks.length} comprobaciones OK`);
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

// Conserva el resultado de los frameworks no ejecutados en esta pasada.
const previousVerify = (await readJson(path.join(ROOT, "results", "verify.json"), [])) ?? [];
const mergedVerify = [
  ...previousVerify.filter((p) => !results.some((r) => r.framework === p.framework)),
  ...results,
];
await writeJson(path.join(ROOT, "results", "verify.json"), mergedVerify.sort((a, b) => a.framework.localeCompare(b.framework)));

const allPassed = results.every((r) => r.passed === r.total);
console.log(`\n${allPassed ? "VERIFY OK" : "VERIFY CON FALLOS"} — resultados en results/verify.json`);
if (!allPassed) process.exitCode = 1;

