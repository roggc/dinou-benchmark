/**
 * bench.config.mjs — The ONLY file coupled to specific frameworks.
 *
 * Adding a framework (e.g. Waku, Remix) consists of:
 *   1. Creating `apps/<id>` with its equivalent application,
 *   2. Adding an entry to `frameworks` here.
 * Nothing else in the harness (scripts/, verify, load, report) needs to change.
 */

export const routes = [
  { id: "home", path: "/", kind: "ssg", label: "SSG · 50 items list" },
  { id: "item", path: "/items/42", kind: "isr", label: "ISR 60s · detail" },
  { id: "dashboard", path: "/dashboard", kind: "ssr", label: "Dynamic SSR · 3 slots" },
  { id: "ppr", path: "/ppr", kind: "ppr", label: "PPR · static shell + slot" },
  { id: "messages", path: "/messages", kind: "ssr", label: "SSR · Server Function + local JSON" },
];

export const setup = {
  /** Routes required to return 404 by the verify script. */
  notFoundPaths: ["/this-route-does-not-exist", "/items/999"],
  /** Milliseconds of artificial delay inside each Suspense slot. */
  holeDelayMs: 200,
  /** Verification thresholds (generous margins for shared environments). */
  thresholds: {
    pprShellMs: 150, // first chunk of shell
    pprHoleMs: 150, // slot must take at least this long
    staticStabilityRuns: 3,
  },
  load: {
    durationSeconds: Number(process.env.LOAD_DURATION || 10),
    connections: Number(process.env.LOAD_CONNECTIONS || 50),
    warmupSeconds: Number(process.env.LOAD_WARMUP || 3),
    runs: Number(process.env.LOAD_RUNS || 3),
    /** Numbers from shared runners are not publishable */
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
    version: "9.0.1",
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
    id: "dinou-9-u",
    name: "Dinou (-u)",
    version: "9.0.1",
    dir: "apps/dinou-9-u",
    port: 3104,
    dev: { cmd: "pnpm", args: ["run", "dev"] },
    build: { cmd: "pnpm", args: ["run", "build"] },
    start: { cmd: "pnpm", args: ["run", "start"] },
    outputDirs: [".dinou"],
    clientAssetHints: ["dist3"],
    hmr: {
      file: "apps/dinou-9-u/src/page.tsx",
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

