/**
 * bench.config.mjs — The ONLY file coupled to specific frameworks.
 *
 * Adding a framework (e.g. Waku, Remix) consists of:
 *   1. Creating `apps/<id>` with its equivalent application,
 *   2. Adding an entry to `frameworks` here.
 * Nothing else in the harness (scripts/, verify, load, report) needs to change.
 */

export const routes = [
  // --- Baseline 5 Core Routes ---
  { id: "home", path: "/", kind: "ssg", label: "SSG · 50 items list" },
  { id: "item", path: "/items/42", kind: "isr", label: "ISR 60s · detail" },
  { id: "dashboard", path: "/dashboard", kind: "ssr", label: "Dynamic SSR · 3 slots" },
  { id: "ppr", path: "/ppr", kind: "ppr", label: "PPR · static shell + slot" },
  { id: "messages", path: "/messages", kind: "ssr", label: "SSR · Server Function + local JSON" },

  // --- Rigorous 3D Caching & Rendering Cube (2^3 - 1 = 7 Combinations) ---
  {
    id: "rigorous-hs",
    path: "/rigorous/hs",
    kind: "hs",
    label: "1. Pure HS · Segmented Layout + Page",
  },
  {
    id: "rigorous-cache-slot",
    path: "/rigorous/cache-slot",
    kind: "cache-slot",
    label: "2. Pure Cache-Slot · Dynamic Host + Micro-ISR Subtrees",
  },
  {
    id: "rigorous-ppr",
    path: "/rigorous/ppr",
    kind: "ppr-rigorous",
    label: "3. Pure Rigorous PPR · Shell + Static/Dynamic/Nested Holes",
  },
  {
    id: "rigorous-ppr-cache-slot",
    path: "/rigorous/ppr-cache-slot",
    kind: "ppr+slot",
    label: "4. Pairwise #1 · PPR + Cache-Slot Synergy",
  },
  {
    id: "rigorous-hs-cache-slot",
    path: "/rigorous/hs-cache-slot",
    kind: "hs+slot",
    label: "5. Pairwise #2 · HS + Cache-Slot Synergy (Non-PPR)",
  },
  {
    id: "rigorous-hs-ppr",
    path: "/rigorous/hs-ppr",
    kind: "hs+ppr",
    label: "6. Pairwise #3 · HS + PPR Synergy (No Cache-Slot)",
  },
  {
    id: "rigorous-triple",
    path: "/rigorous/triple",
    kind: "triple",
    label: "7. Triple Synergy · HS + Cache-Slot + PPR",
  },
];

export const setup = {
  /** Routes required to return 404 by the verify script. */
  notFoundPaths: [
    "/this-route-does-not-exist",
    "/items/999",
    "/rigorous/hs/dept/invalid",
    "/rigorous/hs/locked/unlisted",
  ],
  /** Milliseconds of artificial delay inside baseline Suspense slots (/dashboard, /ppr). */
  holeDelayMs: 200,
  /** Milliseconds of artificial delay inside rigorous PPR dynamic holes. */
  rigorousHoleDelayMs: 50,
  /** Verification thresholds (generous margins for shared environments). */
  thresholds: {
    pprShellMs: 150, // first chunk of shell
    pprHoleMs: 150, // baseline slot must take at least this long
    rigorousPprHoleMs: 30, // rigorous PPR dynamic hole delay threshold
    staticStabilityRuns: 3,
  },
  load: {
    durationSeconds: Number(process.env.LOAD_DURATION || 30),
    connections: Number(process.env.LOAD_CONNECTIONS || 200),
    warmupSeconds: Number(process.env.LOAD_WARMUP || 5),
    runs: Number(process.env.LOAD_RUNS || 5),
    /** Numbers from shared runners are not publishable */
    smokeOnly: true,
  },
};

export const frameworks = [
  {
    id: "dinou-9",
    name: "Dinou",
    version: "9.0.3",
    dir: "apps/dinou-9",
    port: 3121,
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
    version: "9.0.3",
    dir: "apps/dinou-9-u",
    port: 3131,
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
    version: "16.4.3",
    dir: "apps/next",
    port: 3111,
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
