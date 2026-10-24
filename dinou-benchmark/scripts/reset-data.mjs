#!/usr/bin/env node
/** Repone el JSON local de mensajes en ambas apps (estado limpio antes de medir). */
import { cp } from "node:fs/promises";
import path from "node:path";
import { ROOT, frameworks } from "./config.mjs";

for (const fw of frameworks) {
  await cp(
    path.join(ROOT, "shared/data/messages.json"),
    path.join(ROOT, fw.dir, "data/messages.json")
  );
}
console.log(`Datos de mensajes repuestos en ${frameworks.length} apps.`);

