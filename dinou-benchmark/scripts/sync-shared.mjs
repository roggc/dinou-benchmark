#!/usr/bin/env node
/**
 * Copia `shared/` dentro de cada app, byte a byte.
 *
 * Ambos frameworks consumen exactamente los mismos componentes, la misma
 * librería de datos y el mismo CSS. Las apps solo aportan el "pegamento"
 * específico de su router (page.tsx / page_functions.ts y el formulario).
 */
import { cp, mkdir, readFile, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT, frameworks } from "./config.mjs";

const COPY_DIRS = ["lib", "components", "data"];

async function exists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function hashDir(dir, base = dir) {
  const { readdir } = await import("node:fs/promises");
  const entries = await readdir(dir, { withFileTypes: true });
  const hashes = {};
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(hashes, await hashDir(full, base));
    else {
      const buf = await readFile(full);
      hashes[path.relative(base, full)] = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 12);
    }
  }
  return hashes;
}

const resetData = process.argv.includes("--reset-data");
const hashes = {};
let mismatches = 0;

for (const app of frameworks) {
  const appDir = path.join(ROOT, app.dir);
  const targetShared = path.join(appDir, "src", "shared");

  for (const dir of COPY_DIRS) {
    await cp(path.join(ROOT, "shared", dir), path.join(targetShared, dir), { recursive: true });
  }

  await mkdir(path.join(appDir, "public"), { recursive: true });
  await cp(path.join(ROOT, "shared", "styles", "global.css"), path.join(appDir, "public", "global.css"));

  // Almacén mutable de la Server Function: vive fuera de src/shared para que
  // una resincronización no borre los mensajes escritos en tiempo de ejecución.
  const store = path.join(appDir, "data", "messages.json");
  await mkdir(path.dirname(store), { recursive: true });
  if (resetData || !(await exists(store))) {
    await cp(path.join(ROOT, "shared", "data", "messages.json"), store);
  }

  hashes[app.id] = await hashDir(targetShared);
}

// Comprobación de igualdad byte a byte entre apps.
const [first, ...rest] = Object.values(hashes);
for (const other of rest) {
  const keys = new Set([...Object.keys(first), ...Object.keys(other)]);
  for (const key of keys) {
    if (first[key] !== other[key]) {
      mismatches += 1;
      console.error(`difiere: ${key}`);
    }
  }
}

console.log(
  mismatches === 0
    ? `shared/ sincronizado y verificada la igualdad byte a byte en ${frameworks.length} apps (${Object.keys(first).length} ficheros).`
    : `shared/ sincronizado con ${mismatches} diferencias.`
);
if (mismatches > 0) process.exitCode = 1;

