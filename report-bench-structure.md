# Benchmark Architecture & Pipeline Reference (`dinou-benchmark`)

**Date:** November 2, 2026  
**Benchmark Repository:** `dinou-benchmark` (`master` branch)  
**Pipeline Orchestrator:** `scripts/bench.mjs` (`pnpm bench`)  
**Companion Reports:** [`report-run1-run2-comparison.md`](./report-run1-run2-comparison.md) · [`report-run2-results.md`](./report-run2-results.md) · [`report-run1-results.md`](./report-run1-results.md) · [`report-verify.md`](./report-verify.md) · [`report-3d-architecture.md`](./report-3d-architecture.md) · [`report-infra.md`](./report-infra.md) · [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md) · [`report-timeouts-diagnosis-for-dumbs.md`](./report-timeouts-diagnosis-for-dumbs.md)

---

## 1. Overview of the 8-Phase Benchmark Pipeline

The `dinou-benchmark` suite is orchestrated by `scripts/bench.mjs` (`pnpm bench`) and consists of **8 sequential benchmark phases** (plus **2 auxiliary maintenance utilities**). Each phase executes against the configured application targets (`apps/dinou-9`, `apps/dinou-9-u`, and `apps/next`), writes structured telemetry to `results/*.json`, and feeds into the automated report and SVG chart generator (`scripts/report.mjs`).

| Order | Phase / Script | NPM / PNPM Command | What It Measures & Verifies | Machine / Hardware Dependent? |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **Dev Server Cold Start** (`scripts/dev-start.mjs`) | `pnpm bench:dev` | Launches `pnpm run dev` (`NODE_ENV=development`) from a cold process `5` times (`DEV_RUNS=5`) and measures the exact elapsed time from process spawn until `/` responds `200 OK` for the first time.<br>Saves results to `results/dev-start.json`. | **Yes** (CPU / Disk I/O) |
| **2** | **HMR (Hot Module Replacement)** (`scripts/hmr.mjs`) | `pnpm bench:hmr` | Starts `pnpm run dev`, launches headless Chromium via Playwright on `/`, edits `page.tsx` on disk (`HMR_MARKER_*`), and measures the exact millisecond latency until the updated text appears in the live browser DOM without a page reload (`HMR_RUNS=5`).<br>Saves results to `results/hmr.json`. | **Yes** (CPU / OS FS Watcher) |
| **3** | **Production Build** (`scripts/build.mjs`) | `pnpm bench:build` | Deletes `.dinou` / `.next` (`rm -rf`), executes `pnpm run build` multiple times (`BUILD_RUNS`, default `5`), and measures:<br>• **Production build wall-clock time** (median in seconds).<br>• **Total on-disk size of the compiled output directory** (`.dinou` vs. `.next` in MB).<br>Leaves a clean production build on disk for all subsequent phases and saves results to `results/build.json`. | **Build Time: Yes** (CPU / Disk I/O)<br>**Output Size: No** *(Deterministic)* |
| **4** | **Functional & 3D Cube Verification** (`scripts/verify.mjs`) | `pnpm bench:verify` | Executes all **36 end-to-end Playwright & HTTP verification checks** covering the 5 baseline rendering modes (`SSG`, `ISR`, `Dynamic SSR`, `PPR`, `Server Actions`) and all **7 vertices of the 3D Caching & Streaming Cube** (`HS`, `Cache-Slot`, `PPR`, the 3 pairwise synergies, and the Triple Synergy), including `1s` clock TTLs, surgical on-demand revalidation, concurrency stampedes, LWW race conditions, and `F5` hydration.<br>Supports `--runs=N` for multi-run determinism testing. Saves results to `results/verify.json` and is fully documented in `report-verify.md`. | **No** *(100% Hardware-Agnostic)* |
| **5** | **Client JavaScript Bundle** (`scripts/bundle.mjs`) | `pnpm bench:bundle` | Walks the compiled build output, filters exclusively for client-side `.js` assets downloaded by the browser (excluding server-only bundles), and computes:<br>• **Total number of client JS files**.<br>• **Total payload size in Raw bytes, Gzip (level 9), and Brotli (quality 11)**.<br>• Top 5 largest client JS chunks.<br>Saves results to `results/bundle.json`. | **No** *(100% Deterministic & Machine-Independent)* |
| **6** | **Production Load, Throughput & Latency** (`scripts/load.mjs`) | `pnpm bench:load` | Starts the production server (`pnpm run start`) and benchmarks all **12 routes** defined in `bench.config.mjs` (the 5 baseline routes + the 7 routes of the 3D Caching Cube) using `autocannon` (`200` concurrent connections, `5s` warmup, `5` runs of `30s` each), recording per route:<br>• **TTFB** (median and `p95` across `30` sequential probes).<br>• **Throughput (`req/s`)** (median, min, max).<br>• **Latency under load** (`p50`, `p95`, `p99`) and error rate (`%`).<br>Saves results to `results/load.json`. | **Yes** (CPU / Local Network Stack) |
| **7** | **Server Memory Footprint (RAM)** (`scripts/memory.mjs`) | `pnpm bench:memory` | Starts the production server (`pnpm run start`) and samples the full process-tree memory footprint (`ps -eo pid,ppid,rss` / `/proc/<pid>/status` `VmRSS` on Linux or `WorkingSet64` via `scripts/win-rss.ps1` on Windows):<br>• **Idle RSS (MB):** Median of `5` samples taken 3 seconds after server startup.<br>• **Peak RSS (MB):** Maximum memory consumption sampled every `400 ms` while sustaining a `200`-connection, `30s` `autocannon` load burst on `/dashboard` (plus post-load settled RSS `afterLoadBytes`).<br>Saves results to `results/memory.json`. | **Yes** (OS / Process Allocator) |
| **8** | **Automated Report & SVG Charts** (`scripts/report.mjs`) | `pnpm bench:report` | Reads all JSON files in `results/` (or a custom directory via `--dir=<dir>`, such as `results_run1` / `results_run2`) and generates the consolidated markdown report (`REPORT.md`, including the numbered `#1`–`#36` verification breakdown table) and comparative SVG visualizations (`charts.svg`, `ttfb.svg`, `bundle.svg`). | — |

> [!IMPORTANT]
> **Why `dev-start` and `hmr` Precede `build`, `bundle`, `load`, and `memory`:** Running `pnpm run dev` (`dinou dev` / `next dev`) writes development build artifacts into `.dinou` / `.next`. Executing `dev-start` and `hmr` **first**, followed by `build` (which wipes `.dinou` and `.next` clean before compiling), guarantees that `verify`, `bundle`, `load`, and `memory` always operate against an untouched production build.

---

## 2. Auxiliary Maintenance & Data Synchronization Scripts

In addition to the 8 measurement phases, two utility scripts maintain deterministic parity across all compared frameworks:

1. **`scripts/sync-shared.mjs` (`pnpm shared`):**
   - Copies shared React components, rigorous client probes, deterministic state helpers, static data (`items.json`, `messages.json`), and `global.css` from `shared/` into `apps/dinou-9`, `apps/dinou-9-u`, and `apps/next`.
   - Verifies via SHA-256 checksums that all shared files are byte-for-byte identical across all benchmarked applications.
2. **`scripts/reset-data.mjs` (`pnpm bench:reset-data`):**
   - Restores `data/messages.json` inside each app to its initial clean snapshot from `shared/data/messages.json` after mutation tests.

---

## 3. Classification: Hardware-Independent vs. Hardware-Dependent Metrics

A key methodological distinction in `dinou-benchmark` is separating **structural/functional metrics** (which are invariant across machines) from **runtime performance metrics** (which depend on the host CPU, RAM, and OS):

### 3.1 Hardware-Independent (Deterministic & Directly Publishable from Any Machine)
1. **Functional & 3D Architectural Verification (`scripts/verify.mjs` → `report-verify.md`):**
   - Evaluates deterministic architectural invariants (`100% ✅ PASS` vs. `100% ❌ FAIL`), cache isolation, network request counts (`0` redundant layout/page fetches), sequence numbers (`100` vs. `999`), Last-Write-Wins concurrency guards, and React hydration integrity (`0` errors).
2. **Client JavaScript Bundle Weight (`scripts/bundle.mjs` → `results/bundle.json`):**
   - Measures the exact byte count (Raw, Gzip level 9, and Brotli quality 11) of the client-side JavaScript bundles emitted by each framework's production build.
3. **Compiled Build Output Disk Size (`scripts/build.mjs` → `outputBytes` in `results/build.json`):**
   - Measures the on-disk footprint of the compiled `.dinou` vs. `.next` production build directories.

### 3.2 Hardware-Dependent (Sensitive to Host CPU, Disk I/O, and OS Kernel)
1. **Production Build Time (`scripts/build.mjs` → `medianSeconds`):** Depends on CPU single/multi-core speed and filesystem I/O.
2. **Dev Server Cold Start (`scripts/dev-start.mjs`) & HMR Latency (`scripts/hmr.mjs`):** Depend on CPU speed, bundler startup, and OS filesystem watcher latency.
3. **HTTP Throughput (`req/s`), TTFB & Latency Percentiles (`scripts/load.mjs`):** Depend on CPU core count, clock speed, and OS loopback socket throughput (especially when `autocannon` and the server share the same machine vs. isolated load generators).
4. **Idle & Peak Server RAM (`scripts/memory.mjs`):** Depend on the operating system (Linux `VmRSS` vs. Windows `WorkingSet64`) and V8 heap sizing.

---

## 4. Passes, Connections, Statistical Aggregation & Environment Variables by Script

The table below details how many passes/runs each script performs by default, which environment variables or CLI flags control its execution, how each metric is aggregated (`median` vs. `peak` vs. deterministic read), and which scripts are influenced by `LOAD_CONNECTIONS`:

| Script | Default Passes / Samples | Environment Variable / CLI Flag | Statistical Aggregation in `REPORT.md` | Affected by `LOAD_CONNECTIONS`? |
| :--- | :---: | :--- | :--- | :---: |
| **`scripts/dev-start.mjs`** | **`5` passes** | `DEV_RUNS=5` *(env var)* | • **Dev cold start:** **Median** across `DEV_RUNS` (`medianSeconds`). | **No** |
| **`scripts/hmr.mjs`** | **`5` passes** | `HMR_RUNS=5` *(env var)* | • **HMR edit → DOM:** **Median** across `HMR_RUNS` (`medianMs`). | **No** |
| **`scripts/build.mjs`** | **`5` passes** | `BUILD_RUNS=5` *(env var)* | • **Build time:** **Median** across `BUILD_RUNS` (`medianSeconds`).<br>• **Output size:** Exact byte count of `.dinou` / `.next`. | **No** |
| **`scripts/verify.mjs`** | **`1` pass** *(or `N` via CLI)* | `--runs=10` *(CLI flag)* | • Per-check pass/fail rate (`36/36` vs. `30–31/36`) and flaky check detection (`passedRuns < totalRuns`).<br>• Excludes `dinou-9-u` by default so Dinou and Next.js run the exact same number of passes. | **No** |
| **`scripts/bundle.mjs`** | **`1` scan** | N/A *(100% deterministic)* | • Exact byte totals of client `.js` files in Raw, Gzip (level 9), and Brotli (quality 11). | **No** |
| **`scripts/load.mjs`** | **`5` rounds per route** *(+ `30` TTFB probes)* | `LOAD_RUNS=5`<br>`LOAD_DURATION=30`<br>`LOAD_CONNECTIONS=200`<br>`LOAD_WARMUP=5` *(env vars)* | • **TTFB (`p50` / `p95`):** Median and 95th percentile of `30` sequential `timedFetch` probes after warmup.<br>• **`req/s`, `p50`, `p99`:** **Median** across `LOAD_RUNS` rounds of `autocannon`. | **Yes** *(affects `req/s`, `p50`, `p99`, and `Errors`; TTFB probes are sequential)* |
| **`scripts/memory.mjs`** | **`1` server start** *(with `5` idle samples + `1` load burst)* | Uses `LOAD_CONNECTIONS=200` & `LOAD_DURATION=30` *(env vars)* | • **Idle RSS (MB, median):** **Median** of `5` RSS samples taken `400 ms` apart in idle state (`3s` after boot, before load).<br>• **Peak RSS under load (MB):** **Maximum** RSS sampled every `400 ms` during `1` `autocannon` burst on `/dashboard`. | **Idle RSS: No**<br>**Peak RSS: Yes** *(more concurrent connections increase simultaneous in-flight SSR streams)* |

---

## 5. Key Methodological Rules & Measurement Nuances (`scripts/load.mjs`)

- **Production Builds Only**: All three application targets (`dinou-9`, `dinou-9-u`, `next`) are measured in production mode (`build` + `start`), never in development mode (except during the dedicated `dev-start` and `hmr` DX phases).
- **`200` Connections, `30s` Duration, `5` Runs per Route**: All HTTP load metrics represent sustained high-concurrency traffic (`150 seconds` of recorded load per route per framework).
- **`5s` Warm-up at Full `200` Connections**: Executed prior to recording each route to warm up the V8 JIT compiler (TurboFan/Maglev), framework in-memory caches, and the Linux kernel page cache.
- **Percentile Calculation & `p95` (`p97.5` Upper Bound)**: Each published percentile (`p50`, `p95`, `p99`) represents the **median of that respective percentile across the 5 independent rounds** (minimum and maximum throughput values across the 5 rounds are also preserved in `results/load.json`). Because `autocannon` does not record an exact `p95` bucket in its default HDR histogram percentiles, reported `p95` entries in `load.json` and `REPORT.md` represent `autocannon`'s **`p97_5` (`p97.5`) upper bound** (`latency.p95 ?? latency.p97_5`).
- **Sequential TTFB (Unloaded)**: `30` sequential `timedFetch` requests are sampled **without concurrent load (`c = 1`)** right between the `5s` warm-up and the 5 concurrent load rounds. This establishes baseline server processing time without event-loop queueing and must not be conflated with latency under 200-connection load.
- **Keep-Alive Configuration**: `keepAliveTimeout` is configured to `65s` across all apps (with `headersTimeout` set to `66s` in Dinou; Next.js defaults `headersTimeout` to Node's `60s`), preventing premature server-side keep-alive socket closures during a `30s` round.
- **Autocannon Client Socket Timeout (`timeout = 60s` = `2 × duration` in Run 2 vs. `timeout = 30s` in Run 1)**: Setting `timeout = Math.max(60, durationSeconds * 2)` (`60s` for a `30s` test) prevents `autocannon`'s `40 ms` teardown race condition (`lib/run.js`) when `timeout === duration` (`30s === 30s` in Run 1), ensuring delayed initial-burst connections are recorded as tail latency (`p99` / `max`) rather than teardown-window timeout counters (see [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md)).
- **Zero Active Instrumentation**: No diagnostic hooks, probes, or request-logging listeners are active during official benchmark runs.

---

## 6. Limitations & Boundary Conditions

- **Colocated Client & Server (`loopback`)**: The load generator (`autocannon`) and application servers ran on the same 4-vCPU dedicated host over Linux loopback (`127.0.0.1`). Because a single-process Node.js server uses `~1.0 vCPU` and `autocannon` uses `~0.6–0.8 vCPU`, `~2.0` dedicated vCPUs remain free for OS networking, `libuv`, and V8 GC; interference is minimal and identical across frameworks, though non-zero (see [`report-infra.md`](./report-infra.md)).
- **Sample Size & Multi-Run Reproducibility**: The benchmark repository includes **two complete, independent cloud runs** (`results_run1/` and `results_run2/`, each comprising `5` independent `30s` rounds per route across `12` routes and `10` verification passes across `36` checks = `720` total verification executions per framework). Total wall-clock pipeline duration replicated within **`0.41%`** (`6,073s` vs. `6,048s`), and per-route medians replicated within **`~1%–5%`** (see [`report-run1-run2-comparison.md`](./report-run1-run2-comparison.md)).
- **Synthetic Delays**: The `200 ms` (`await sleep(200)`) delays on `/dashboard` and `/ppr` and the `80 ms` (`await sleep(80)`) delays on the 7 `/rigorous/*` 3D Cube routes simulate realistic database query and upstream API latencies without introducing external network jitter.
- **Single-Process Node.js Execution**: Results reflect single-process Node.js execution (`node start.js` / `next start`). Multi-core production deployments (`node:cluster`, PM2, or multiple container replicas behind Nginx/Envoy) scale horizontally with different absolute throughput ceilings.
- **Next.js 16 Architecture (`cacheComponents: true`)**: Next.js 16 replaces `experimental.ppr` with `cacheComponents: true` (`"use cache"`, `cacheLife`, `cacheTag`, `updateTag`, `connection()`). Both framework implementations follow their respective idiomatic conventions across all 12 routes and 36 verification checks.

---

## 7. How to Reproduce End-to-End

### 7.1 Machine Provisioning & Environment Setup

For rigorous, clean reproduction without noisy-neighbor CPU interference, deploy a dedicated cloud instance (**DigitalOcean CPU-Optimized, 4 Dedicated vCPUs / 8 GB RAM on Ubuntu 24.04 LTS**) and run the automated provisioning script:

```bash
git clone https://github.com/roggc/dinou-benchmark
cd dinou-benchmark

# Option A: Automated droplet provisioning (recommended)
# Installs Node 22 LTS, pnpm 12.15.0, autocannon 8.0.0, k6 0.54.0, Playwright Chromium,
# configures 4 GB swap, tunes kernel network/file limits (somaxconn=65535, nofile=1048576),
# and runs pnpm install --frozen-lockfile + pnpm shared:
sudo bash infra/droplet-setup.sh
```

If reproducing manually or on an already provisioned machine, initialize dependencies and sync shared components explicitly:

```bash
# Option B: Manual setup
pnpm install --frozen-lockfile
pnpm shared
pnpm exec playwright install --with-deps chromium
```

### 7.2 Running the Official Cloud Benchmark Workflow (`verify --runs=10` + `bench --skip=verify`)

```bash
# 1. Log exact hardware and runtime parameters
mkdir -p results
{ date -u; uname -a; lscpu; free -h; df -h; node -v; pnpm -v; } > results/env.txt

# 2. Run the 10-pass 3D verification determinism suite (36 checks × 10 runs = 360 executions/framework):
ulimit -n 65535
node scripts/verify.mjs --only=dinou-9,next --runs=10

# 3. Run the remaining hardware-dependent benchmark phases (defaults: 5 runs, 200 connections, 30s duration, 5s warmup):
node scripts/bench.mjs --skip=verify
```

### 7.3 Quick Command Reference (Full Suite & Individual Phases)

```bash
# Run the entire 8-phase pipeline end to end:
pnpm bench

# Run the dedicated-hardware benchmark skipping verify (reusing existing verify.json):
node scripts/bench.mjs --skip=verify

# Run only specific phases (e.g., build + bundle + report):
node scripts/bench.mjs --only-steps=build,bundle,report

# Customize pass counts or load parameters via environment variables if desired (defaults are already 5 runs / 200 conn / 30s):
BUILD_RUNS=5 DEV_RUNS=5 HMR_RUNS=5 LOAD_RUNS=5 LOAD_CONNECTIONS=200 LOAD_DURATION=30 LOAD_WARMUP=5 node scripts/bench.mjs --skip=verify

# Filter any phase to specific frameworks (dinou-9, dinou-9-u, next):
pnpm bench:verify --only=dinou-9,next
pnpm bench:bundle --only=dinou-9,next
pnpm bench:load --only=dinou-9,next

# Regenerate REPORT.md and SVG charts directly inside archived run directories:
node scripts/report.mjs --dir=results_run1
node scripts/report.mjs --dir=results_run2
```


