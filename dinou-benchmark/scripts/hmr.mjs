#!/usr/bin/env node
/**
 * HMR real: abre la app en Chromium, edita un fichero de la página de inicio y
 * mide cuánto tarda el texto nuevo en aparecer en el DOM sin recargar.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { ROOT, selectedFrameworks } from "./config.mjs";
import { startServer, writeJson, round, median } from "./lib.mjs";

const frameworks = selectedFrameworks();
const runs = Number(process.env.HMR_RUNS || 2);
const results = [];

for (const fw of frameworks) {
  const cwd = path.join(ROOT, fw.dir);
  const file = path.join(ROOT, fw.hmr.file);
  const original = await readFile(file, "utf8");
  const samples = [];

  const restore = async () => writeFile(file, original, "utf8");

  try {
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
      const browser = await chromium.launch();
      try {
        const page = await browser.newPage();
        await page.goto(server.url, { waitUntil: "networkidle", timeout: 120_000 });
        await page.waitForFunction((m) => document.body.innerText.includes(m), fw.hmr.find, {
          timeout: 120_000,
        });

        const started = Date.now();
        await writeFile(file, original.replace(fw.hmr.find, fw.hmr.replace), "utf8");
        await page.waitForFunction((m) => document.body.innerText.includes(m), fw.hmr.replace, {
          timeout: 120_000,
          polling: 50,
        });
        samples.push((Date.now() - started) / 1000);
        await restore();
        await new Promise((r) => setTimeout(r, 500));
      } finally {
        await browser.close();
        await server.stop();
      }
    }
  } finally {
    await restore();
  }

  console.log(
    `${fw.name}: HMR ${samples.map((s) => round(s * 1000, 0)).join(" / ")} ms (mediana ${round(median(samples) * 1000, 0)} ms)`
  );
  results.push({
    framework: fw.id,
    version: fw.version,
    runsMs: samples.map((s) => Math.round(s * 1000)),
    medianMs: Math.round(median(samples) * 1000),
    at: new Date().toISOString(),
  });
}

await writeJson(path.join(ROOT, "results", "hmr.json"), results);

