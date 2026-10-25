/**
 * bench.config.mjs — el ÚNICO fichero acoplado a un framework.
 *
 * Añadir un framework (por ejemplo Waku) consiste en:
 *   1. crear `apps/<id>` con su app equivalente,
 *   2. añadir una entrada más a `frameworks` aquí.
 * Nada más del harness (scripts/, verify, load, report) cambia.
 */

export const routes = [
  { id: "home", path: "/", kind: "ssg", label: "SSG · listado de 50 items" },
  { id: "item", path: "/items/42", kind: "isr", label: "ISR 60 s · detalle" },
  { id: "dashboard", path: "/dashboard", kind: "ssr", label: "SSR dinámico · 3 huecos" },
  { id: "ppr", path: "/ppr", kind: "ppr", label: "PPR · shell estático + hueco" },
  { id: "messages", path: "/messages", kind: "ssr", label: "SSR · Server Function + JSON local" },
];

export const setup = {
  /** Rutas que el script de verificación exige que devuelvan 404. */
  notFoundPaths: ["/esta-ruta-no-existe", "/items/999"],
  /** Milisegundos de retardo artificial dentro de cada hueco Suspense. */
  holeDelayMs: 200,
  /** Umbrales de la verificación (holgados a propósito: la máquina es compartida). */
  thresholds: {
    pprShellMs: 150, // primer chunk del shell
    pprHoleMs: 150, // el hueco debe tardar al menos esto
    staticStabilityRuns: 3,
  },
  load: {
    durationSeconds: Number(process.env.LOAD_DURATION || 10),
    connections: Number(process.env.LOAD_CONNECTIONS || 50),
    warmupSeconds: Number(process.env.LOAD_WARMUP || 3),
    runs: Number(process.env.LOAD_RUNS || 3),
    /** los números de un contenedor compartido no son publicables */
    smokeOnly: true,
  },
};

export const frameworks = [
  {
    id: "dinou-8",
    name: "Dinou",
    version: "8.1.2",
    dir: "apps/dinou-8",
    port: 3101,
    dev: { cmd: "pnpm", args: ["run", "dev"] },
    build: { cmd: "pnpm", args: ["run", "build"] },
    start: { cmd: "pnpm", args: ["run", "start"] },
    outputDirs: [".dinou"],
    clientAssetHints: ["dist3"],
    hmr: {
      file: "apps/dinou-8/src/page.tsx",
      find: "HMR_MARKER_DINOU",
      replace: "HMR_MARKER_DINOU_EDITADO",
    },
  },
  {
    id: "dinou-9",
    name: "Dinou",
    version: "9.0.0",
    dir: "apps/dinou-9",
    port: 3103,
    dev: { cmd: "pnpm", args: ["run", "dev"] },
    build: { cmd: "pnpm", args: ["run", "build"] },
    start: { cmd: "pnpm", args: ["run", "start"] },
    outputDirs: [".dinou"],
    clientAssetHints: ["dist3"],
    hmr: {
      file: "apps/dinou-9/src/page.tsx",
      find: "HMR_MARKER_DINOU",
      replace: "HMR_MARKER_DINOU_EDITADO",
    },
  },
  {
    id: "next",
    name: "Next.js",
    version: "16.4.2",
    dir: "apps/next",
    port: 3102,
    dev: { cmd: "pnpm", args: ["run", "dev"] },
    build: { cmd: "pnpm", args: ["run", "build"] },
    start: { cmd: "pnpm", args: ["run", "start"] },
    outputDirs: [".next"],
    clientAssetHints: ["static", "chunks"],
    hmr: {
      file: "apps/next/src/app/page.tsx",
      find: "HMR_MARKER_NEXT",
      replace: "HMR_MARKER_NEXT_EDITADO",
    },
  },
];

export default { routes, setup, frameworks };

