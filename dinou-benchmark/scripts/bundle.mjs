#!/usr/bin/env node
/**
 * Client JavaScript bundle size: traverses build output, filters assets
 * downloaded by the browser, and computes gzip and brotli compression.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import { ROOT, selectedFrameworks } from "./config.mjs";
import { writeJson, round } from "./lib.mjs";

const frameworks = selectedFrameworks();
const results = [];

async function walk(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

for (const fw of frameworks) {
  const files = [];
  for (const out of fw.outputDirs) {
    files.push(...(await walk(path.join(ROOT, fw.dir, out))));
  }

  const isClientAsset = (file) => {
    if (!file.endsWith(".js")) return false;
    const rel = file.split(path.sep).join("/");
    // Server bundles are never counted.
    if (/\/server\//.test(rel) || rel.endsWith("server.mjs")) return false;
    return fw.clientAssetHints.some((hint) => rel.includes(hint));
  };

  const clientFiles = files.filter(isClientAsset);
  let raw = 0;
  let gzip = 0;
  let brotli = 0;
  const biggest = [];

  for (const file of clientFiles) {
    const buf = await readFile(file);
    const gz = zlib.gzipSync(buf, { level: 9 }).length;
    const br = zlib.brotliCompressSync(buf, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length;
    const size = (await stat(file)).size;
    raw += size;
    gzip += gz;
    brotli += br;
    biggest.push({ file: path.relative(path.join(ROOT, fw.dir), file), raw: size, gzip: gz });
  }

  biggest.sort((a, b) => b.raw - a.raw);

  console.log(
    `${fw.name} ${fw.version}: ${clientFiles.length} client JS files · ${round(raw / 1024, 1)} KiB raw · ${round(gzip / 1024, 1)} KiB gzip · ${round(brotli / 1024, 1)} KiB brotli`
  );

  results.push({
    framework: fw.id,
    version: fw.version,
    files: clientFiles.length,
    rawBytes: raw,
    gzipBytes: gzip,
    brotliBytes: brotli,
    biggest: biggest.slice(0, 5),
    at: new Date().toISOString(),
  });
}

await writeJson(path.join(ROOT, "results", "bundle.json"), results);

