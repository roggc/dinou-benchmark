import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

export const ROOT = path.resolve(new URL("..", import.meta.url).pathname);

export function log(...args) {
  console.log(...args);
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export function round(n, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function portFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, "127.0.0.1");
  });
}

export async function waitForPortFree(port, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await portFree(port)) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

/**
 * Arranca un servidor en su propio grupo de procesos y espera a que la ruta
 * `readyPath` responda 200. Devuelve el tiempo de arranque y un `stop()`.
 */
export async function startServer({ cwd, cmd, args, port, readyPath = "/", timeoutMs = 180_000, env = {} }) {
  const started = Date.now();
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, PORT: String(port), NODE_ENV: env.NODE_ENV ?? "production", ...env },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });

  let output = "";
  child.stdout.on("data", (d) => {
    output += d.toString();
  });
  child.stderr.on("data", (d) => {
    output += d.toString();
  });

  const url = `http://127.0.0.1:${port}${readyPath}`;
  let readyMs = null;
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) break;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.status < 500) {
        readyMs = Date.now() - started;
        break;
      }
    } catch {
      /* todavía no escucha */
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  const stop = async () => {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch {
      try {
        child.kill("SIGKILL");
      } catch {}
    }
    await waitForPortFree(port, 15_000);
  };

  if (readyMs === null) {
    await stop();
    throw new Error(`El servidor no respondió en ${timeoutMs} ms (${cmd} ${args.join(" ")})\n--- log ---\n${output.slice(-4000)}`);
  }

  return { child, readyMs, output: () => output, stop, port, url: `http://127.0.0.1:${port}` };
}

/** Ejecuta un comando y devuelve código, salida y duración. */
export function runCommand({ cwd, cmd, args, timeoutMs = 600_000, env = {} }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
      try {
        child.kill("SIGKILL");
      } catch {}
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, ms: Date.now() - started });
    });
  });
}

/**
 * Petición HTTP que mide por separado el primer byte/chunk y el final del body.
 * Es lo que permite distinguir un shell PPR (rápido) de su hueco (lento).
 */
export async function timedFetch(url, { timeoutMs = 30_000 } = {}) {
  const started = performance.now();
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  let firstChunkMs = null;
  let body = "";

  if (!res.body) {
    body = await res.text();
    return { status: res.status, headers: res.headers, body, firstChunkMs: performance.now() - started, totalMs: performance.now() - started };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let first = true;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (first && value && value.length) {
      firstChunkMs = performance.now() - started;
      first = false;
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();
  const totalMs = performance.now() - started;
  return {
    status: res.status,
    headers: res.headers,
    body,
    firstChunkMs: firstChunkMs ?? totalMs,
    totalMs,
  };
}

/** Limpia una ruta dentro del repo (nunca fuera de él). */
export async function cleanDir(relPath) {
  const target = path.join(ROOT, relPath);
  if (!target.startsWith(ROOT)) throw new Error("ruta fuera del repo");
  await rm(target, { recursive: true, force: true });
}

