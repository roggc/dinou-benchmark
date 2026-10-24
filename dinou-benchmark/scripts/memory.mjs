#!/usr/bin/env node
/**
 * RAM del servidor de producción: RSS en reposo y pico durante carga.
 *
 * Se lee únicamente el campo VmRSS de /proc/<pid>/status del árbol de procesos
 * que este script ha arrancado (no se inspecciona el entorno de nadie).
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import autocannon from "autocannon";
import { ROOT, routes, setup, selectedFrameworks } from "./config.mjs";
import { startServer, writeJson, round, median } from "./lib.mjs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const frameworks = selectedFrameworks();
const results = [];

// En gVisor (y en varios runtimes de contenedor) la contabilidad de /proc está
// inflada y VmRSS no es por proceso: los MB absolutos no son fiables.
const { stdout: kernelRelease } = await promisify(execFile)("uname", ["-r"]);
const reliable = !/gvisor/i.test(kernelRelease);
if (!reliable) {
  console.warn("aviso: kernel gVisor detectado, el RSS de /proc no es por proceso; se marcará como no fiable.");
}

async function childrenOf(pid) {
  try {
    const raw = await readFile(`/proc/${pid}/task/${pid}/children`, "utf8");
    return raw.trim().split(/\s+/).filter(Boolean).map(Number);
  } catch {
    return [];
  }
}

async function rssOf(pid) {
  try {
    const raw = await readFile(`/proc/${pid}/status`, "utf8");
    const match = raw.match(/^VmRSS:\s+(\d+) kB/m);
    return match ? Number(match[1]) * 1024 : 0;
  } catch {
    return 0;
  }
}

async function treeRss(pid) {
  let total = await rssOf(pid);
  for (const child of await childrenOf(pid)) total += await treeRss(child);
  return total;
}

function runAutocannon(opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(opts, (error, result) => (error ? reject(error) : resolve(result)));
    instance.on("error", reject);
  });
}

for (const fw of frameworks) {
  const cwd = path.join(ROOT, fw.dir);
  const server = await startServer({
    cwd,
    cmd: "pnpm",
    args: ["run", "start"],
    port: fw.port,
    readyPath: "/",
    timeoutMs: 180_000,
  });

  try {
    await new Promise((r) => setTimeout(r, 3000));
    const idle = [];
    for (let i = 0; i < 5; i += 1) {
      idle.push(await treeRss(server.child.pid));
      await new Promise((r) => setTimeout(r, 400));
    }

    const peak = { value: 0 };
    const sampler = setInterval(async () => {
      const value = await treeRss(server.child.pid);
      if (value > peak.value) peak.value = value;
    }, 400);

    await runAutocannon({
      url: `${server.url}${(routes.find((r) => r.kind === "ssr") ?? routes[0]).path}`,
      connections: setup.load.connections,
      duration: setup.load.durationSeconds,
      pipelining: 1,
    });

    clearInterval(sampler);
    const afterLoad = await treeRss(server.child.pid);
    const idleMedian = median(idle);

    console.log(
      `${fw.name}: RSS reposo ${round(idleMedian / 1e6, 1)} MB · pico ${round(peak.value / 1e6, 1)} MB · post-carga ${round(afterLoad / 1e6, 1)} MB`
    );

    results.push({
      framework: fw.id,
      version: fw.version,
      idleBytes: Math.round(idleMedian),
      peakBytes: Math.round(peak.value),
      afterLoadBytes: afterLoad,
      at: new Date().toISOString(),
      reliable,
      note: reliable
        ? "RSS del árbol de procesos del servidor; incluye el wrapper de pnpm."
        : "RSS del árbol de procesos, pero el kernel es gVisor: la cifra está inflada y no es por proceso.",
    });
  } finally {
    await server.stop();
  }
}

await writeJson(path.join(ROOT, "results", "memory.json"), results);

