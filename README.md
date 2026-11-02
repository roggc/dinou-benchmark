# dinou-benchmark

Reproducible benchmark suite comparing **Dinou 9.0.3** (`dinou-9` vendorized and `dinou-9-u` unvendorized `-u`) and **Next.js 16.4.3** running **the exact same application**: identical local data, identical React 19 components, identical CSS, and the full 3D caching & revalidation matrix defined in the `rigurous-*.md` specification documents.

> **Official Benchmark Results & Engineering Reports (4 Dedicated Intel Xeon vCPUs / 8 GB RAM DigitalOcean CPU-Optimized Droplet):**
> - [`report-run2-results.md`](./report-run2-results.md) & [`report-run1-results.md`](./report-run1-results.md) — Complete 12-route & 3D Caching Cube empirical results across **Run 1** (`timeout = 30s`, [`results_run1/`](./results_run1/)) and **Run 2** (`timeout = 60s`, [`results_run2/`](./results_run2/)).
> - [`report-3d-architecture.md`](./report-3d-architecture.md) — Architectural analysis: True End-to-End Orthogonal 3D Caching (Dinou 9) vs. Server-Only Coupled 2.5D Caching (Next.js 16).
> - [`report-verify.md`](./report-verify.md) — Detailed breakdown of all **36 end-to-end Playwright behavioral checks** (`36 checks × 10 runs = 360 executions` per run).
> - [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md) & [`report-timeouts-diagnosis-for-dumbs.md`](./report-timeouts-diagnosis-for-dumbs.md) — Forensic Linux `epoll`, Grafana `k6`, and `autocannon` socket-queue telemetry.
> - [`report-infra.md`](./report-infra.md) & [`report-bench-structure.md`](./report-bench-structure.md) — Hardware sizing, OS process scheduling, verified `lscpu`/kernel fingerprint, and benchmark harness architecture.

---

## 1. What Is Compared

### 1.1. Baseline Routes (5 Core Rendering Strategies)

| Route | Strategy | Behavior |
| --- | --- | --- |
| `/` | SSG | 50 items loaded from local JSON, statically pre-rendered once at build time |
| `/items/[id]` | ISR (60s) | 100 pre-rendered routes (`getStaticPaths` / `generateStaticParams`), revalidating every 60s |
| `/dashboard` | Dynamic SSR | Shell per request + three `<Suspense>` slots with 200ms artificial delay each, in parallel |
| `/ppr` | PPR | Static shell + one 200ms dynamic slot streamed in the same HTTP response |
| `/messages` | SSR + Mutation | Server Function / Server Action writing to local JSON and revalidating the route |

### 1.2. Rigorous 3D Caching & Revalidation Suites (7 Suites from `rigurous-*.md`)

| Route | Dimension / Synergy | What Is Verified & Benchmarked |
| --- | --- | --- |
| `/rigorous/hs` | **1. Horizontal Segmentation (HS)** | Independent `layout.rsc` vs `page.rsc`, sibling soft navigation with 0 layout remounts/fetches, nested `L2` layouts + `@badge` parallel slot, dynamic `[deptId]` (`validateParams`), static-locked `[code]` (`allowISG = false`), `reset_layout` & `no_layout` escape hatches, surgical `revalidatePage` vs `revalidateLayout` with lazy `index.html` re-composition, and independent 1s clock-based TTL expiration |
| `/rigorous/cache-slot` | **2. Vertical Segmentation (`<DinouCacheSlot>` / `"use cache"`)** | Subtree Micro-ISR inside dynamic (`revalidate = 0`) and static (`3600s`) hosts, `revalidate={0}` slot cache bypass, surgical `refreshSlot`, shared multi-slot tag invalidation, nested slots (`Outer -> Inner`), `"use server"` action prop serialization inside cached slots, and 1s slot TTL expiration |
| `/rigorous/ppr` | **3. Partial Prerendering (PPR)** | Static `shell.html` + build-time collapsed static `<Suspense>` + concurrent dynamic holes (`cookies`, `query`, `headers`), client widget inside streamed hole, nested `<Suspense>` (outer static + inner dynamic & outer dynamic + deep inner dynamic), `React.memo` hole, inherited PPR & child `ppr = false` opt-out, `</template><script>` XSS guard, and 1s shell TTL |
| `/rigorous/ppr-cache-slot` | **4. Pairwise Synergy #1: PPR + Cache-Slot** | Cached slots inside the PPR static shell (`inStaticShell: true`), inside collapsed static `<Suspense>`, and inside streamed dynamic `<Suspense>` holes (`inStaticShell: false`), nested hole slots, and slot before sibling cookie reader |
| `/rigorous/hs-cache-slot` | **5. Pairwise Synergy #2: HS + Cache-Slot** | Slots across `L1` layout, `@sidebar` parallel route, sibling pages (`Page A` / `Page B`), and `L2` nested layout; cross-axis shared tag invalidation; round-trip `Page A -> Page B -> Page A` slot persistence; and Last-Write-Wins (LWW) out-of-order refresh race protection |
| `/rigorous/hs-ppr` | **6. Pairwise Synergy #3: HS + PPR** | `L1` PPR layout + `@sidebar` dynamic hole + sibling PPR pages + `ppr = false` static child opt-out + `L2` nested PPR layout; surgical `revalidatePage` vs `revalidateLayout` with lazy `shell.html` re-composition; and 1s layout/page PPR TTL |
| `/rigorous/triple` | **7. Triple Synergy: HS + Cache-Slot + PPR** | Full 3D caching matrix combining `L1`/`L2` PPR layouts, PPR & static child pages, static-shell slots, dynamic-hole slots, nested hole slots, surgical tag/page/layout revalidation, and 1s clock-based TTL expiration |

No external network calls, no third-party databases, no CDN: all measured latency and throughput reflect framework runtime performance.

## 2. Fixed Package Versions

| Package | Version |
| --- | --- |
| `dinou` (`dinou-9` & `dinou-9-u`) | **9.0.3** (npm) |
| `next` | **16.4.3** (npm) |
| `react` / `react-dom` | **19.3.1** (identical across all apps) |
| `typescript` | 5.9.3 |
| `@types/react` | 19.2.7 |
| `@types/react-dom` | 19.2.3 |
| `@types/node` | 22.20.0 |
| `autocannon` | 8.0.0 |
| `playwright` | 1.64.1 |
| `pnpm` (`packageManager`) | 12.15.0 |

## 3. Repository Structure

```
dinou-benchmark/
├── apps/
│   ├── dinou-9/                # Idiomatic Dinou 9.0.3 app (vendorized build)
│   ├── dinou-9-u/              # Idiomatic Dinou 9.0.3 app (unvendorized -u build)
│   └── next/                   # Idiomatic Next.js 16.4.3 app (cacheComponents: true)
├── shared/                     # Single source of truth
│   ├── components/             # Identical React components + rigorous client probes
│   ├── lib/                    # Data helpers + deterministic rigorous state store
│   ├── data/                   # items.json and messages.json
│   └── styles/global.css       # Identical CSS across all apps
├── scripts/
│   ├── sync-shared.mjs         # Copies shared/ to each app & mirrors rigorous suites
│   ├── build.mjs               # Measures production build time + output size
│   ├── verify.mjs              # 36 functional & 3D caching E2E checks per framework
│   ├── dev-start.mjs           # Dev server cold-start time
│   ├── hmr.mjs                 # Real Chromium HMR edit-to-DOM measurement
│   ├── bundle.mjs              # Client JS gzip & brotli bundle analysis
│   ├── load.mjs                # TTFB, req/s, and p50/p99 latency via autocannon
│   ├── memory.mjs              # Idle and peak RSS memory consumption
│   ├── report.mjs              # Generates results/REPORT.md + charts.svg
│   └── bench.mjs               # Main pipeline orchestrator
├── rigurous-*.md               # 11 architectural & E2E specification documents
├── infra/
│   └── droplet-setup.sh        # Automated DigitalOcean Ubuntu 24.04 LTS provisioning
├── report-*.md                 # Official empirical benchmark & architectural reports
├── results_run1/               # Archived Run 1 JSON telemetry, logs, reports & SVG charts (timeout=30s)
├── results_run2/               # Archived Run 2 JSON telemetry, logs, reports & SVG charts (timeout=60s)
├── results/                    # Working output directory populated by local `pnpm bench` runs
└── bench.config.mjs            # Single source of truth for framework configurations
```

## 4. How to Run

### Locally

```bash
pnpm install
pnpm shared          # Copies shared/ to all apps and verifies byte-for-byte SHA equality
pnpm bench           # Runs the full benchmark pipeline
```

Individual phases:

```bash
pnpm bench:build     # Build time and output size
pnpm bench:verify    # 36 functional & rigorous E2E checks per framework
pnpm bench:dev       # Dev cold start time
pnpm bench:hmr       # HMR in real browser
pnpm bench:bundle    # Client bundle size (raw, gzip, brotli)
pnpm bench:load      # autocannon throughput & latency across all 12 routes
pnpm bench:memory    # RSS memory idle & peak under load
pnpm bench:report    # Regenerates report and SVG charts from results/*.json
```

Filter by framework with `--only=`:

```bash
pnpm bench:load --only=dinou-9
pnpm bench:verify --only=dinou-9,next
```

## 5. Documented Framework Differences (Dinou 9.0.3 vs. Next.js 16.4.3)

1. **Horizontal Segmentation (`layout.rsc` vs. `page.rsc`) & Lazy HTML Re-Composition.**
   - **Dinou 9.0.3** persists `layout.rsc` + `layout.metadata.json` independently from `page.rsc` + `metadata.json`. Calling `revalidateLayout(path)` regenerates only `layout.rsc`; on the next request to any static or PPR child route, Dinou detects `leafLayout.generatedAt > page.generatedAt` and lazily re-composes `index.html` / `shell.html` in `O(1)` without re-executing the child's `page.tsx`.
   - **Next.js 16.4.3** (`cacheComponents: true`) caches segment computations via `"use cache"` + `cacheTag` / `cacheLife` and invalidates via `revalidatePath(path, 'layout' | 'page')` and `updateTag`.
2. **Vertical Segmentation (`<DinouCacheSlot>` + `refreshSlot` vs. `"use cache"` + `updateTag`).**
   - **Dinou 9.0.3** provides `<DinouCacheSlot id="..." tags={[...]} revalidate={N}>` and a surgical client router primitive `refreshSlot(idOrTag, { fresh })` that fetches `/____rsc_slot____/:id` and reconciles only that slot's fiber subtree without re-rendering the enclosing page or layout. On the server, `revalidateTag(slotTag)` refreshes static/PPR-shell hosts via `{ onlyRefreshSlots: true }` without re-executing `page.tsx` or `layout.tsx`, and evicts only `slots/<id>` for dynamic-hole slots (`inStaticShell: false`) to preserve `0ms` static shell TTFB.
   - **Next.js 16.4.3** caches component subtrees via `"use cache"` functions/components with `cacheTag` and `cacheLife` (composing nested slots via `<OuterSlot><InnerSlot /></OuterSlot>`). Refreshing a slot from the client requires a Server Action (`updateTag`) followed by `router.refresh()`.
3. **Partial Prerendering (PPR) & Static `<Suspense>` Collapse.**
   - **Dinou 9.0.3** enables PPR via `export const ppr = true` in `page_functions.ts` or `layout_functions.ts` (with automatic inheritance to child routes and `export const ppr = false` child opt-out). During build-time Pass A, any `<Suspense>` boundary whose subtree does not access request context (`ctx.req.cookies`, `headers`, `query`) or `useSearchParams()` collapses automatically into `shell.html` for instant TTFB, while request-dependent boundaries emit `$PPR_HOLE` markers and stream concurrently at request time.
   - **Next.js 16.4.3** enables PPR globally via `cacheComponents: true`, collapsing `"use cache"` subtrees into the static shell and streaming `<Suspense>` subtrees that call `await connection()`, `await cookies()`, `await headers()`, or `await searchParams`.

## 6. License

MIT. The benchmark apps are demo implementations; frameworks belong to their respective authors.
