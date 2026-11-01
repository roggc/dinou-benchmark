# Benchmark Architecture & Pipeline Reference (`dinou-benchmark`)

**Date:** November 1, 2026  
**Benchmark Repository:** `dinou-benchmark` (`dev` branch)  
**Pipeline Orchestrator:** `scripts/bench.mjs` (`pnpm bench`)

---

## 1. Overview of the 8-Phase Benchmark Pipeline

The `dinou-benchmark` suite is orchestrated by `scripts/bench.mjs` (`pnpm bench`) and consists of **8 sequential benchmark phases** (plus **2 auxiliary maintenance utilities**). Each phase executes against the configured application targets (`apps/dinou-9`, `apps/dinou-9-u`, and `apps/next`), writes structured telemetry to `results/*.json`, and feeds into the automated report and SVG chart generator (`scripts/report.mjs`).

| Order | Phase / Script | NPM / PNPM Command | What It Measures & Verifies | Machine / Hardware Dependent? |
| :-: | :--- | :--- | :--- | :---: |
| **1** | **Production Build** (`scripts/build.mjs`) | `pnpm bench:build` | Deletes `.dinou` / `.next`, executes `pnpm run build` multiple times (`BUILD_RUNS`, default `2`), and measures:<br>• **Production build wall-clock time** (median in seconds).<br>• **Total on-disk size of the compiled output directory** (`.dinou` vs. `.next` in MB).<br>Saves results to `results/build.json`. | **Build Time: Yes** (CPU / Disk I/O)<br>**Output Size: No** *(Deterministic)* |
| **2** | **Functional & 3D Cube Verification** (`scripts/verify.mjs`) | `pnpm bench:verify` | Executes all **36 end-to-end Playwright & HTTP verification checks** covering the 5 baseline rendering modes (`SSG`, `ISR`, `Dynamic SSR`, `PPR`, `Server Actions`) and all **7 vertices of the 3D Caching & Streaming Cube** (`HS`, `Cache-Slot`, `PPR`, the 3 pairwise synergies, and the Triple Synergy), including `1s` clock TTLs, surgical on-demand revalidation, concurrency stampedes, LWW race conditions, and `F5` hydration.<br>Supports `--runs=N` for multi-run determinism testing. Saves results to `results/verify.json` and is fully documented in `report-verify.md`. | **No** *(100% Hardware-Agnostic)* |
| **3** | **Client JavaScript Bundle** (`scripts/bundle.mjs`) | `pnpm bench:bundle` | Walks the compiled build output, filters exclusively for client-side `.js` assets downloaded by the browser (excluding server-only bundles), and computes:<br>• **Total number of client JS files**.<br>• **Total payload size in Raw bytes, Gzip (level 9), and Brotli (quality 11)**.<br>• Top 5 largest client JS chunks.<br>Saves results to `results/bundle.json`. | **No** *(100% Deterministic & Machine-Independent)* |
| **4** | **Dev Server Cold Start** (`scripts/dev-start.mjs`) | `pnpm bench:dev` | Launches `pnpm run dev` (`NODE_ENV=development`) from a cold process `3` times (`DEV_RUNS=3`) and measures the exact elapsed time from process spawn until `/` responds `200 OK` for the first time.<br>Saves results to `results/dev-start.json`. | **Yes** (CPU / Disk I/O) |
| **5** | **HMR (Hot Module Replacement)** (`scripts/hmr.mjs`) | `pnpm bench:hmr` | Starts `pnpm run dev`, launches headless Chromium via Playwright on `/`, edits `page.tsx` on disk (`HMR_MARKER_*`), and measures the exact millisecond latency until the updated text appears in the live browser DOM without a page reload (`HMR_RUNS=2`).<br>Saves results to `results/hmr.json`. | **Yes** (CPU / OS FS Watcher) |
| **6** | **Production Load, Throughput & Latency** (`scripts/load.mjs`) | `pnpm bench:load` | Starts the production server (`pnpm run start`) and benchmarks all **12 routes** defined in `bench.config.mjs` (the 5 baseline routes + the 7 routes of the 3D Caching Cube) using `autocannon` (`50` concurrent connections, `3s` warmup, `3` runs of `10s` each), recording per route:<br>• **TTFB** (median and `p95` across `30` sequential probes).<br>• **Throughput (`req/s`)** (median, min, max).<br>• **Latency under load** (`p50`, `p95`, `p99`) and error rate (`%`).<br>Saves results to `results/load.json`. | **Yes** (CPU / Local Network Stack) |
| **7** | **Server Memory Footprint (RAM)** (`scripts/memory.mjs`) | `pnpm bench:memory` | Starts the production server (`pnpm run start`) and samples the full process-tree memory footprint (`VmRSS` via `/proc` on Linux or `WorkingSet64` via `scripts/win-rss.ps1` on Windows):<br>• **Idle RSS (MB):** Baseline memory consumption 3 seconds after server startup.<br>• **Peak RSS (MB):** Maximum memory consumption while sustaining `autocannon` load bursts across both baseline and rigorous 3D routes.<br>Saves results to `results/memory.json`. | **Yes** (OS / Process Allocator) |
| **8** | **Automated Report & SVG Charts** (`scripts/report.mjs`) | `pnpm bench:report` | Reads all JSON files in `results/` (`build.json`, `verify.json`, `bundle.json`, `dev-start.json`, `hmr.json`, `load.json`, `memory.json`) and generates the consolidated markdown summary (`results/REPORT.md`) and comparative SVG visualizations (`results/charts.svg`). | — |

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

## 4. Quick Command Reference

```bash
# Run the entire 8-phase pipeline end to end:
pnpm bench

# Run only specific phases (e.g., build + bundle + report):
node scripts/bench.mjs --only-steps=build,bundle,report

# Skip specific phases (e.g., skip hmr and load):
node scripts/bench.mjs --skip=hmr,load

# Filter any phase to specific frameworks (dinou-9, dinou-9-u, next):
pnpm bench:verify --only=dinou-9,next
pnpm bench:bundle --only=dinou-9,next
pnpm bench:load --only=dinou-9,next
```

