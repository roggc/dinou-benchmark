#!/usr/bin/env node
/** Restores the local messages JSON in all apps (clean state before measuring). */
import { cp } from "node:fs/promises";
import path from "node:path";
import { ROOT, frameworks } from "./config.mjs";

for (const fw of frameworks) {
  await cp(
    path.join(ROOT, "shared/data/messages.json"),
    path.join(ROOT, fw.dir, "data/messages.json")
  );
}
console.log(`Message data reset in ${frameworks.length} apps.`);

