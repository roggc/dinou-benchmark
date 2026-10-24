import { fileURLToPath } from "node:url";
import config from "../bench.config.mjs";

export const ROOT = fileURLToPath(new URL("..", import.meta.url)).replace(/[/\\]$/, "");
export const { routes, setup, frameworks } = config;

export function frameworkById(id) {
  const fw = frameworks.find((f) => f.id === id);
  if (!fw) throw new Error(`framework desconocido: ${id}`);
  return fw;
}

export function selectedFrameworks(argv = process.argv) {
  const flag = argv.find((a) => a.startsWith("--only="));
  if (!flag) return frameworks;
  const ids = flag.replace("--only=", "").split(",");
  return ids.map(frameworkById);
}

