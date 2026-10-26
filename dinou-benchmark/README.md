# dinou-benchmark

Reproducible benchmark suite comparing **Dinou 9.0.0**, **Dinou 8.1.2**, and **Next.js 16.4.2** running **the exact same application**: identical local data, identical React components, and identical CSS. The goal is not to "win", but to measure with an explicit, transparent methodology and document everything that **cannot** be matched between different frameworks.

> **Honesty Notice.** Results included in `results/` (if any) are produced in a single-core shared sandbox environment. They serve to verify that the benchmark harness works properly, **not** to publish definitive comparisons. Any publishable figures should come from `pnpm bench` executed on the dedicated hardware described in `infra/` with the load generator isolated.

---

## 1. What Is Compared

A single full-stack app, idiomatically implemented across each framework:

| Route | Strategy | Behavior |
| --- | --- | --- |
| `/` | SSG | 50 items loaded from local JSON, statically pre-rendered once at build time |
| `/items/[id]` | ISR (60s) | 100 pre-rendered routes (`getStaticPaths` / `generateStaticParams`), revalidating every 60s |
| `/dashboard` | Dynamic SSR | Shell per request + three `<Suspense>` slots with 200ms artificial delay each, in parallel |
| `/ppr` | PPR | Static shell + one 200ms dynamic slot streamed in the same HTTP response |
| `/messages` | SSR + Mutation | Server Function / Server Action writing to local JSON and revalidating the route |

No external network calls, no third-party databases, no CDN: all measured latency and throughput reflect framework runtime performance.

## 2. Fixed Package Versions

| Package | Version |
| --- | --- |
| `dinou` (v9) | **9.0.0** (npm) |
| `dinou` (v8) | **8.1.2** (npm) |
| `next` | **16.4.2** (npm) |
| `react` / `react-dom` | **19.3.1** (identical across all apps) |
| `typescript` | 5.9.3 |
| `@types/react` | 19.2.7 |
| `@types/react-dom` | 19.2.3 |
| `@types/node` | 22.20.0 |
| `autocannon` | 8.0.0 |
| `playwright` | 1.64.1 |
| `pnpm` (`packageManager`) | 12.15.0 |

Pinned versions, zero ranges: `pnpm-lock.yaml` is included so anyone gets an identical dependency tree.

## 3. Repository Structure

```
dinou-benchmark/
├── apps/
│   ├── dinou-8/                # Idiomatic Dinou 8.1.2 app (src/, page_functions.ts)
│   ├── dinou-9/                # Idiomatic Dinou 9.0.0 app (src/, page_functions.ts)
│   └── next/                   # Idiomatic Next.js app (src/app/)
├── shared/                     # Single source of truth
│   ├── components/             # Identical React components
│   ├── lib/                    # Data helpers + local JSON store
│   ├── data/                   # items.json and messages.json
│   └── styles/global.css       # Identical CSS across all apps
├── scripts/
│   ├── sync-shared.mjs         # Copies shared/ to each app & verifies byte-for-byte match
│   ├── build.mjs               # Measures production build time + output size
│   ├── verify.mjs              # 13 functional verification checks per framework
│   ├── dev-start.mjs           # Dev server cold-start time
│   ├── hmr.mjs                 # Real Chromium HMR edit-to-DOM measurement
│   ├── bundle.mjs              # Client JS gzip & brotli bundle analysis
│   ├── load.mjs                # TTFB, req/s, and p50/p99 latency via autocannon
│   ├── memory.mjs              # Idle and peak RSS memory consumption
│   ├── report.mjs              # Generates results/REPORT.md + charts.svg
│   └── bench.mjs               # Main pipeline orchestrator
├── results/                    # Execution JSON files + generated reports & charts
├── bench.config.mjs            # Single source of truth for framework configurations
├── infra/droplet-setup.sh      # DigitalOcean setup script (Dedicated CPU)
└── .github/workflows/bench.yml # CI pipeline validation
```

### Adding a Framework

`bench.config.mjs` is the only point of coupling. To add another framework (e.g. Waku, Remix/React Router):

1. Create `apps/<name>` with the equivalent app (same routes and components from `shared/`).
2. Add an entry to `frameworks` with its `dev`/`build`/`start` commands, port, output directories, and HMR target.

Neither `verify.mjs`, `load.mjs`, nor `report.mjs` need to change.

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
pnpm bench:verify    # 13 functional checks per framework
pnpm bench:dev       # Dev cold start time
pnpm bench:hmr       # HMR in real browser
pnpm bench:bundle    # Client bundle size (raw, gzip, brotli)
pnpm bench:load      # autocannon throughput & latency
pnpm bench:memory    # RSS memory idle & peak under load
pnpm bench:report    # Regenerates report and SVG charts from results/*.json
```

Filter by framework with `--only=`:

```bash
pnpm bench:load --only=dinou-9
pnpm bench:verify --only=dinou-9,next
```

Quick smoke testing:

```bash
LOAD_DURATION=5 LOAD_RUNS=2 LOAD_CONNECTIONS=40 pnpm bench:load
```

> **Cross-Platform:** The benchmark runner is fully cross-platform and runs natively on Windows, macOS, and Linux.

### GitHub Actions

`.github/workflows/bench.yml` runs installation, builds all apps, and runs `verify`. **It does not publish performance numbers**: it serves as a CI quality gate, because shared cloud runners are not controlled benchmark environments.

### Dedicated Cloud Droplet (Publishable Results)

For definitive, publishable comparisons:

1. Create an **Ubuntu 24.04** droplet on DigitalOcean with **CPU-Optimized (Dedicated vCPUs)** (e.g. 4 Dedicated vCPUs / 8 GB RAM, `c-4`).
2. Clone the repo and run the automated setup:

```bash
cd /opt
git clone <REPO_URL> dinou-benchmark
cd dinou-benchmark
bash infra/droplet-setup.sh
pnpm bench
```

## 5. Methodology

- **Production Only.** No performance numbers are recorded in development mode. Load and memory tests execute against production builds (`pnpm build` + `pnpm start`).
- **Warmup at Full Target Concurrency.** Each route receives a dedicated warm-up phase (`setup.load.warmupSeconds` at `setup.load.connections`) before recorded runs begin to warm the V8 JIT, route handlers, and kernel socket allocations.
- **Statistical Median Across Runs.** `load` runs multiple independent iterations (`setup.load.runs`, default 3) and reports the **median** across rounds (with min/max tracking) to eliminate run-to-run variance.
- **Sequential TTFB (Unloaded Baseline).** TTFB is sampled sequentially across 30 requests (median and p95) prior to the load test, isolating baseline server processing time from client-side concurrent queueing.
- **HTTP Keep-Alive Parity.** Servers run with HTTP keep-alive timeouts set to 65 seconds (`keepAliveTimeout: 65000`, `headersTimeout: 66000` in Dinou; `--keepAliveTimeout 65000` in Next.js).
- **Client Timeout & Socket Backlog Accounting.** Autocannon per-request timeout is configured as `Math.max(30, durationSeconds)` so that cold burst socket queueing is captured as tail latency rather than premature client-side aborts. See [analysis.md](analysis.md) for the exhaustive investigation into single-threaded event loop accept backlog mechanics under 200-connection bursts.
- **PPR Measured via Streaming.** `verify` inspects both the first chunk and full stream: the static shell must arrive immediately, and dynamic slots arrive later in the same response stream.
- **Real-Browser HMR.** Launches Chromium via Playwright, updates source code on disk, and chronometers until the DOM reflects the change without a full page reload.
- **Bundle Measurement.** Traverses client-side production assets and compresses each using gzip (-9) and brotli (-11).
- **Process-Tree Memory.** Inspects RSS memory across the entire process tree: idle (5 samples) and peak under load.

### Verification Gate (`pnpm bench:verify`)

13 functional checks per framework must pass with 100% success before metrics are recorded: 200 status codes, 50 items rendered, HTML stability in SSG/ISR, semantic 404 responses, dynamic dashboard rendering, Suspense streaming slots, PPR streaming shell + hole, and full mutation lifecycle in a browser (form submit → Server Action → reload → persistent update).

> Note: `autocannon` records latency natively at `p50`, `p97.5`, and `p99` (`p97.5` is used as the conservative upper bound for `p95`). Reported percentiles represent the median of each respective percentile across the 3 independent execution runs. Reported throughput reflects sustainable steady-state capacity; maximum latencies in cold-burst tests reflect initial kernel accept queue dwell times (detailed in [analysis.md](analysis.md)).

## 6. Documented Framework Differences

These differences are intrinsic to framework design. They are documented so observers know what is being compared:

1. **Caching Primitives.** Dinou defines cache lifetimes with `export const revalidate` (in seconds) in `page_functions.ts`. Next.js 16 with `cacheComponents` defines ISR with `'use cache'` + `cacheLife({ revalidate: 60 })` and 404s with `notFound()`. The semantics are equivalent; the syntax and engine differ.
2. **Partial Prerendering (PPR).** Dinou declares PPR per segment with `export const ppr = true`. Next.js 16 declares PPR through `cacheComponents: true` combined with `connection()` boundaries inside `<Suspense>`.
3. **Flat Linker.** Dinou resolves internal tools via flat module resolution. The workspace specifies `nodeLinker: hoisted` in `pnpm-workspace.yaml`.
4. **CSS Delivery.** The identical `global.css` is served statically from `public/` in all apps to ensure clean comparison of framework runtime overhead without varying bundler CSS injection strategies.
5. **Production Bundler.** Next.js 16 utilizes Turbopack for production builds; Dinou utilizes esbuild with its Node orchestration layer.

## 7. Results

`pnpm bench` generates:

- `results/*.json`: Structured machine-readable results per framework and phase.
- `results/REPORT.md`: Comprehensive Markdown comparative tables.
- `results/charts.svg`, `results/ttfb.svg`, `results/bundle.svg`: Zero-dependency vector charts.

The JSON results are ignored by Git by default. The Markdown report is committed whenever you decide to publish.

## 8. License

MIT. The benchmark apps are demo implementations; frameworks belong to their respective authors.
