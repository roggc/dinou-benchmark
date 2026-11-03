# Dinou v9.0.3 vs. Next.js v16.4.3 — Run 1 (`timeout = 30s`) vs. Run 2 (`timeout = 60s`) Reproducibility & Comparison Report

**Date:** November 2, 2026  
**Benchmark Repository:** `dinou-benchmark` (`master` branch)  
**Frameworks Evaluated:** **Dinou v9.0.3** (`dinou-9`), **Dinou v9.0.3 Unvendorized** (`dinou-9-u`, `dinou -u`), and **Next.js v16.4.3** (`next`), all running **React 19.3.1**  
**Environment:** DigitalOcean CPU-Optimized Dedicated Droplet — 4 Dedicated Intel Xeon vCPUs / 8 GB RAM / Regular Intel SSD / Ubuntu 24.04 LTS  
**Total Pipeline Execution Time:** `Run 1: 6,073 seconds` (`1h 41m 13s`) vs. `Run 2: 6,048 seconds` (`1h 40m 48s` — a `0.41%` variance)  
**Raw Data Archives:** [`results_run1/`](./results_run1/) ([`REPORT.md`](./results_run1/REPORT.md), `timeout = 30s`) · [`results_run2/`](./results_run2/) ([`REPORT.md`](./results_run2/REPORT.md), `timeout = 60s`)  
**Companion Reports:** [`report-run1-results.md`](./report-run1-results.md) · [`report-run2-results.md`](./report-run2-results.md) · [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md) · [`report-timeouts-diagnosis-for-dumbs.md`](./report-timeouts-diagnosis-for-dumbs.md) · [`report-3d-architecture.md`](./report-3d-architecture.md) · [`report-verify.md`](./report-verify.md) · [`report-bench-structure.md`](./report-bench-structure.md) · [`report-infra.md`](./report-infra.md) · [`report-deep-dive-investigation.md`](./report-deep-dive-investigation.md)

> [!IMPORTANT]
> **Authoritative Source of Truth ([`results_run1/`](./results_run1/) & [`results_run2/`](./results_run2/)):** The raw telemetry files in [`results_run1/`](./results_run1/) and [`results_run2/`](./results_run2/) (`*.json`, `bench-run.log`, `env.txt`, `REPORT.md`, and `*.svg`) are the untouched, machine-generated outputs emitted directly by the benchmark suite on the Linux droplet without any AI processing or manual modification. In the event of any discrepancy between this narrative comparison report and the raw archives, the files in [`results_run1/`](./results_run1/) and [`results_run2/`](./results_run2/) are the authoritative source of truth.

---

## 1. Executive Summary & Rationale for Run 2

Following **Run 1** ([`report-run1-results.md`](./report-run1-results.md)), our forensic socket and kernel investigation ([`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md)) uncovered why `autocannon` had reported timeouts on two Dinou routes (`/rigorous/cache-slot`: `338` in `dinou-9` / `300` in `dinou-9-u`; `/rigorous/hs-cache-slot`: `1` in `dinou-9` / `30` in `dinou-9-u`) and four Next.js routes (`/rigorous/cache-slot`: `99`, `/rigorous/hs-cache-slot`: `160`, `/rigorous/ppr-cache-slot`: `1`, `/rigorous/triple`: `19`):

1. In [`scripts/load.mjs`](./scripts/load.mjs), the per-request `timeout` formula had originally been written as `Math.max(30, setup.load.durationSeconds)` when `durationSeconds` was `10s` (providing a `3×` safety margin: `timeout = 30s > duration = 10s`).
2. When `LOAD_DURATION` was scaled up to `30s` for the production droplet benchmark, `Math.max(30, 30)` evaluated to `30s`, inadvertently setting **`timeout === duration` (`30s === 30s`)**.
3. Inside `autocannon`'s source code (`node_modules/autocannon/lib/run.js`, lines 86–118), client `timeoutTicker` timers (`30,000 ms`) are initialized in `initialiseClients()` **a few milliseconds before** `stopTimer` (`30,000 ms`) and `tickInterval` (`client.destroy()`). As a result, any initial-burst socket still waiting in the queue when the 30-second test ended fired a false-positive `timeout` at **`+30.03s – +30.05s`** (during the `40 ms` teardown window).

To validate this finding empirically and measure run-to-run reproducibility across the entire benchmark suite, we restored the `timeout > duration` invariant in [`scripts/load.mjs`](./scripts/load.mjs) (`timeout: Math.max(60, setup.load.durationSeconds * 2)` = **`60s`**) and executed **Run 2** ([`report-run2-results.md`](./report-run2-results.md)) from scratch across all phases (`verify` × 10 runs, `dev-start` × 5, `hmr` × 5, `build` × 5, `bundle`, `load` × 5 rounds per route, and `memory`).

### Key Outcomes of Comparing Run 1 vs. Run 2:
1. **`0 Errors (100% OK)` Across All 36 Route-Framework Combinations (`12 routes × 3 apps`) in Run 2:**
   - Raising `autocannon`'s timeout from `30s` to `60s` eliminated **100% of timeouts in both Dinou (`339 → 0` and `330 → 0`) and Next.js (`279 → 0`)**.
2. **Rock-Solid Reproducibility Between Run 1 and Run 2:**
   - Combined across both runs, the benchmark encompasses **`20` full Playwright verification runs (`720` E2E check executions per framework)** and **`10` full 30-second load rounds (`300 seconds` of sustained 200-connection load per route per framework)**, with throughput, latency, build, startup, HMR, and memory metrics reproducing within tight `1%–5%` tolerances.

---

## 2. Global Scorecard: Run 1 vs. Run 2 Across All Benchmark Dimensions

| Benchmark Dimension | Dinou 9.0.3 (`Run 1` → `Run 2`) | Dinou `-u` 9.0.3 (`Run 1` → `Run 2`) | Next.js 16.4.3 (`Run 1` → `Run 2`) | Dinou Vendorized (`dinou-9`) Lead vs. Next.js (Run 1 / Run 2) |
| :--- | :---: | :---: | :---: | :--- |
| **1. 3D Verification (`36 checks × 10 runs` per run = `720` total)** | **`36/36 ✅` (`360/360`) → `36/36 ✅` (`360/360`)** | *Identical runtime* | `30/36` (`308/360`) → `31/36` (`310/360`) | **Dinou `720/720` (`100.0%`, `0` flaky) vs. Next.js `618/720` (`85.8%`)** |
| **2. Production Build Time (`Median of 5 runs`)** | **`6.69 s` → `6.52 s`** | **`6.54 s` → `6.39 s`** | `14.88 s` → `14.54 s` | **Dinou `2.22×–2.23×` faster (`-8.02 to -8.19 s` per build)** |
| **3. Build Output Size on Disk (`.dinou` vs. `.next`)** | **`7.5 MB` → `7.5 MB`** | **`7.5 MB` → `7.5 MB`** | `59.7 MB` → `59.6 MB` | **Dinou `7.95×–7.96×` smaller on disk (`-52.1 to -52.2 MB`)** |
| **4. Client JS Bundle Weight (`Brotli` / `Gzip` / `Raw`)** | **`81.8` / `94.2` / `283.3 KiB`** | **`81.8` / `94.2` / `283.3 KiB`** | `158.3` / `182.4–182.5` / `585.7 KiB` | **Dinou `1.94×` smaller client JS (`-48.3%` Brotli)** |
| **5. Dev Server Cold Start (`Median of 5 runs`)** | **`2.18 s` → `2.09 s`** | `2.27 s` → `2.16 s` | `3.55 s` → `3.48 s` | **Dinou `1.63×–1.67×` faster cold start (`-1.37 to -1.39 s`)** |
| **6. Browser HMR Edit-to-DOM (`Median of 5 runs`)** | **`271 ms` → `266 ms`** | **`271 ms` → `260 ms`** | `314 ms` → `290 ms` | **Dinou `1.09×–1.16×` faster HMR (`-24 to -43 ms`)** |
| **7. Idle Server Memory (`Median of 5 samples`)** | `275.2 MB` → `275.1 MB` | `275.3 MB` → `275.4 MB` | **`245.9 MB` → `246.5 MB`** | **Next.js `~29 MB` lower at idle** |
| **8. Peak Memory Under 200-Conn Load (`Peak RSS`)** | **`488.3 MB` → `492.5 MB`** | **`476.7 MB` → `498.7 MB`** | `1,060.5 MB` → `1,019.3 MB` | **Dinou `2.07×–2.17×` lower peak RAM (`-526.8 to -572.2 MB`)** |
| **9. Post-Load Settled Memory (`RSS after load`)** | **`488.4 MB` → `492.6 MB`** | **`476.3 MB` → `490.0 MB`** | `1,060.5 MB` → `1,019.4 MB` | **Dinou `2.07×–2.17×` lower settled RAM (`-526.8 to -572.1 MB`)** |
| **10. Total Load Timeouts Across All 12 Routes** | `339` (`Run 1`) → **`0` (`Run 2`)** | `330` (`Run 1`) → **`0` (`Run 2`)** | `279` (`Run 1`) → **`0` (`Run 2`)** | **`0 errors (100% OK)` across all 3 frameworks in Run 2** |

---

## 3. Side-by-Side 12-Route HTTP Load Comparison (`Run 1` vs. `Run 2`)

### 3.1 Throughput (`req/s`) & Socket Timeout Comparison (`Run 1` → `Run 2`)

| Route | Dinou 9.0.3 (`Run 1` → `Run 2`) | Dinou `-u` 9.0.3 (`Run 1` → `Run 2`) | Next.js 16.4.3 (`Run 1` → `Run 2`) | Run-to-Run Consistency & Timeout Resolution (`dinou-9` vs. `next`) |
| :--- | :---: | :---: | :---: | :--- |
| **`/`** | `1,424.3` → **`1,432.4 req/s`** (`0` → `0` err) | `1,385.5` → **`1,397.3 req/s`** (`0` → `0` err) | `791.5` → `835.8 req/s` (`0` → `0` err) | `< 1%` variance on Dinou; Dinou leads by `1.71×–1.80×` (`0` errors in both runs) |
| **`/items/42`** | `1,229.2` → **`1,274.1 req/s`** (`0` → `0` err) | **`1,250.9`** → `1,214.8 req/s` (`0` → `0` err) | `1,235.9` → **`1,292.5 req/s`** (`0` → `0` err) | `~3%` variance; tied throughput (`~1,230–1,290 req/s`), `0` errors in both runs |
| **`/dashboard`** | `392.7` → **`408.0 req/s`** (`0` → `0` err) | `396.6` → **`409.9 req/s`** (`0` → `0` err) | `178.9` → `189.2 req/s` (`0` → `0` err) | Dinou leads by `2.20×` (Run 1) and `2.16×` (Run 2) |
| **`/ppr`** | `504.0` → **`514.4 req/s`** (`0` → `0` err) | `509.6` → **`534.3 req/s`** (`0` → `0` err) | `188.2` → `196.6 req/s` (`0` → `0` err) | Dinou leads by `2.68×` (Run 1) and `2.62×` (Run 2) |
| **`/messages`** | `411.0` → **`421.7 req/s`** (`0` → `0` err) | `409.1` → **`420.8 req/s`** (`0` → `0` err) | `154.0` → `170.0 req/s` (`0` → `0` err) | Dinou leads by `2.67×` (Run 1) and `2.48×` (Run 2) |
| **`/rigorous/hs`** | `1,126.5` → **`1,180.0 req/s`** (`0` → `0` err) | `1,118.6` → **`1,145.0 req/s`** (`0` → `0` err) | `1,150.4` → **`1,245.9 req/s`** (`0` → `0` err) | Tied throughput (`0.95×–0.98×`); Dinou `1.60×–1.86×` faster TTFB |
| **`/rigorous/cache-slot`** | `215.5` (`338` err) → **`222.1 req/s` (`0` err)** | `210.7` (`300` err) → **`215.9 req/s` (`0` err)** | `124.7` (`99` err) → `133.3 req/s` (`0` err) | **All `338`/`300`/`99` timeouts eliminated (`0` err); Dinou leads by `1.67×–1.73×`** |
| **`/rigorous/ppr`** | **`196.4` → `196.4 req/s`** (`0` → `0` err) | `194.2` → `187.3 req/s` (`0` → `0` err) | `130.6` → `139.7 req/s` (`0` → `0` err) | Exact `196.4 req/s` match on `dinou-9` across both runs; Dinou leads by `1.41×–1.50×` |
| **`/rigorous/ppr-cache-slot`** | `187.7` → **`190.3 req/s`** (`0` → `0` err) | **`185.0`** → `181.0 req/s` (`0` → `0` err) | `98.6` (`1` err) → `107.1 req/s` (`0` err) | Next.js timeout eliminated; Dinou leads by `1.78×–1.90×` |
| **`/rigorous/hs-cache-slot`** | `684.7` (`1` err) → **`689.0 req/s` (`0` err)** | `656.4` (`30` err) → **`693.4 req/s` (`0` err)** | `102.7` (`160` err) → `110.7 req/s` (`0` err) | **All `1`/`30`/`160` timeouts eliminated; Dinou leads by `6.22×–6.67×`** |
| **`/rigorous/hs-ppr`** | `191.5` → **`194.7 req/s`** (`0` → `0` err) | `181.7` → **`194.7 req/s`** (`0` → `0` err) | `119.7` → `127.3 req/s` (`0` → `0` err) | Dinou leads by `1.53×–1.60×` with `3.1×` lower `p99` |
| **`/rigorous/triple`** | `206.8` → **`209.7 req/s`** (`0` → `0` err) | `196.7` → **`211.1 req/s`** (`0` → `0` err) | `93.7` (`19` err) → `100.3 req/s` (`0` err) | **Next.js `19` timeouts eliminated; Dinou leads by `2.09×–2.21×`** |

---

### 3.2 Latency (`p50` & `p99`) & Unloaded TTFB Comparison (`Run 1` → `Run 2`)

| Route | Dinou 9.0.3 (`p50` / `p99` · `TTFB`: `Run 1` → `Run 2`) | Next.js 16.4.3 (`p50` / `p99` · `TTFB`: `Run 1` → `Run 2`) | Dinou Latency & TTFB Lead (`Run 1` → `Run 2`) |
| :--- | :---: | :---: | :--- |
| **`/`** | `129`/`173 ms` (`1.48 ms`) → **`127`/`176 ms` (`1.45 ms`)** | `199`/`402 ms` (`6.21 ms`) → `188`/`392 ms` (`5.59 ms`) | **`1.48×–1.54×` lower `p50` · `2.23×–2.32×` lower `p99` · `3.86×–4.20×` faster TTFB** |
| **`/items/42`** | `147`/`186 ms` (`1.40 ms`) → **`143`/`185 ms` (`1.18 ms`)** | `146`/`188 ms` (`2.16 ms`) → `143`/`181 ms` (`2.03 ms`) | **Tied `p50`/`p99` (`~143–147 ms` / `~181–188 ms`) · `1.54×–1.72×` faster TTFB** |
| **`/dashboard`** | `481`/`725 ms` (`2.93 ms`) → **`461`/`683 ms` (`3.05 ms`)** | `921`/`10,001 ms` (`7.70 ms`) → `920`/`9,195 ms` (`7.26 ms`) | **`1.91×–2.00×` lower `p50` · `13.5×–13.8×` lower `p99` · `2.38×–2.63×` faster TTFB** |
| **`/ppr`** | `384`/`478 ms` (`2.41 ms`) → **`381`/`479 ms` (`2.42 ms`)** | `951`/`7,192 ms` (`3.13 ms`) → `945`/`6,255 ms` (`2.74 ms`) | **`2.48×` lower `p50` · `13.1×–15.0×` lower `p99` · `1.13×–1.30×` faster TTFB** |
| **`/messages`** | `458`/`1,935 ms` (`2.53 ms`) → **`445`/`1,655 ms` (`2.48 ms`)** | `1,073`/`8,355 ms` (`7.83 ms`) → `1,017`/`7,497 ms` (`6.20 ms`) | **`2.29×–2.34×` lower `p50` · `4.32×–4.53×` lower `p99` · `2.50×–3.09×` faster TTFB** |
| **`/rigorous/hs`** | `157`/`203 ms` (`1.46 ms`) → **`153`/`200 ms` (`1.20 ms`)** | `156`/`203 ms` (`2.34 ms`) → `142`/`183 ms` (`2.23 ms`) | **Tied `p50`/`p99` (`~142–157 ms` / `~183–203 ms`) · `1.60×–1.86×` faster TTFB** |
| **`/rigorous/cache-slot`** | `359`/`6,282 ms` (`4.58 ms`) → **`350`/`5,973 ms` (`4.70 ms`)** | `973`/`18,897 ms` (`3.73 ms`) → `917`/`18,552 ms` (`2.74 ms`) | **`2.62×–2.71×` lower `p50` · `3.01×–3.11×` lower `p99`** |
| **`/rigorous/ppr`** | `937`/`7,394 ms` (`2.47 ms`) → **`918`/`7,380 ms` (`2.29 ms`)** | `1,172`/`17,254 ms` (`3.36 ms`) → `1,095`/`15,892 ms` (`3.04 ms`) | **`1.19×–1.25×` lower `p50` · `2.15×–2.33×` lower `p99` · `1.33×–1.36×` faster TTFB** |
| **`/rigorous/ppr-cache-slot`** | `909`/`11,333 ms` (`2.70 ms`) → **`904`/`10,714 ms` (`2.70 ms`)** | `1,436`/`22,051 ms` (`3.16 ms`) → `1,392`/`19,607 ms` (`3.26 ms`) | **`1.54×–1.58×` lower `p50` · `1.83×–1.95×` lower `p99` · `1.17×–1.21×` faster TTFB** |
| **`/rigorous/hs-cache-slot`** | `208`/`325 ms` (`2.08 ms`) → **`205`/`312 ms` (`1.75 ms`)** | `1,039`/`19,753 ms` (`3.46 ms`) → `1,029`/`19,344 ms` (`2.96 ms`) | **`5.00×–5.02×` lower `p50` · `60.8×–62.0×` lower `p99` · `1.66×–1.69×` faster TTFB** |
| **`/rigorous/hs-ppr`** | `975`/`6,263 ms` (`2.46 ms`) → **`980`/`5,787 ms` (`2.17 ms`)** | `1,209`/`19,651 ms` (`3.52 ms`) → `1,164`/`18,068 ms` (`3.13 ms`) | **`1.19×–1.24×` lower `p50` · `3.12×–3.14×` lower `p99` · `1.43×–1.44×` faster TTFB** |
| **`/rigorous/triple`** | `732`/`11,799 ms` (`4.07 ms`) → **`720`/`11,381 ms` (`3.74 ms`)** | `1,448`/`22,034 ms` (`3.29 ms`) → `1,428`/`21,651 ms` (`3.36 ms`) | **`1.98×` lower `p50` · `1.87×–1.90×` lower `p99`** |

---

## 4. Detailed Phase Breakdown: Run 1 vs. Run 2 Raw Samples (`n = 5`)

### 4.1 Dev Server Cold Start (`scripts/dev-start.mjs`, `n = 5`)
- **Dinou 9.0.3 (`dinou-9`):**
  - **Run 1:** `2.21 / 2.18 / 2.14 / 2.21 / 2.16 s` → **Median: `2.18 s`**
  - **Run 2:** `2.15 / 2.07 / 2.09 / 2.09 / 2.05 s` → **Median: `2.09 s`**
- **Dinou (`-u`) 9.0.3 (`dinou-9-u`):**
  - **Run 1:** `2.34 / 2.27 / 2.26 / 2.26 / 2.32 s` → **Median: `2.27 s`**
  - **Run 2:** `2.22 / 2.16 / 2.16 / 2.13 / 2.23 s` → **Median: `2.16 s`**
- **Next.js 16.4.3 (`next`):**
  - **Run 1:** `3.56 / 3.55 / 3.55 / 3.54 / 3.56 s` → **Median: `3.55 s`**
  - **Run 2:** `3.61 / 3.47 / 3.48 / 3.48 / 3.52 s` → **Median: `3.48 s`**

### 4.2 Browser HMR Latency (`scripts/hmr.mjs`, `n = 5`)
- **Dinou 9.0.3 (`dinou-9`):**
  - **Run 1:** `266 / 271 / 258 / 330 / 272 ms` → **Median: `271 ms`**
  - **Run 2:** `270 / 266 / 257 / 268 / 256 ms` → **Median: `266 ms`**
- **Dinou (`-u`) 9.0.3 (`dinou-9-u`):**
  - **Run 1:** `263 / 317 / 318 / 268 / 271 ms` → **Median: `271 ms`**
  - **Run 2:** `260 / 263 / 256 / 259 / 268 ms` → **Median: `260 ms`**
- **Next.js 16.4.3 (`next`):**
  - **Run 1:** `299 / 345 / 309 / 314 / 316 ms` → **Median: `314 ms`**
  - **Run 2:** `334 / 290 / 328 / 284 / 288 ms` → **Median: `290 ms`**

### 4.3 Production Build Speed & Disk Footprint (`scripts/build.mjs`, `n = 5`)
- **Dinou 9.0.3 (`dinou-9`):**
  - **Run 1:** `6.57 / 6.73 / 6.65 / 6.69 / 6.73 s` → **Median: `6.69 s`** · Output: **`7.5 MB`** (`7,473,400 bytes`)
  - **Run 2:** `6.47 / 7.52 / 6.67 / 6.52 / 6.48 s` → **Median: `6.52 s`** · Output: **`7.5 MB`** (`7,488,924 bytes`)
- **Dinou (`-u`) 9.0.3 (`dinou-9-u`):**
  - **Run 1:** `6.61 / 6.59 / 6.47 / 6.54 / 6.53 s` → **Median: `6.54 s`** · Output: **`7.5 MB`** (`7,482,184 bytes`)
  - **Run 2:** `6.33 / 6.39 / 6.40 / 6.40 / 6.32 s` → **Median: `6.39 s`** · Output: **`7.5 MB`** (`7,482,184 bytes`)
- **Next.js 16.4.3 (`next`):**
  - **Run 1:** `14.84 / 14.88 / 15.26 / 14.89 / 14.77 s` → **Median: `14.88 s`** · Output: **`59.7 MB`** (`59,667,313 bytes`)
  - **Run 2:** `14.33 / 14.45 / 14.68 / 14.68 / 14.54 s` → **Median: `14.54 s`** · Output: **`59.6 MB`** (`59,646,981 bytes`)

### 4.4 Process-Tree Memory Footprint (`scripts/memory.mjs`)
- **Dinou 9.0.3 (`dinou-9`):**
  - **Run 1:** Idle `275.2 MB` · Peak under 200-conn load **`488.3 MB`** (`+213.1 MB`) · Post-load `488.4 MB`
  - **Run 2:** Idle `275.1 MB` · Peak under 200-conn load **`492.5 MB`** (`+217.4 MB`) · Post-load `492.6 MB`
- **Dinou (`-u`) 9.0.3 (`dinou-9-u`):**
  - **Run 1:** Idle `275.3 MB` · Peak under 200-conn load **`476.7 MB`** (`+201.4 MB`) · Post-load `476.3 MB`
  - **Run 2:** Idle `275.4 MB` · Peak under 200-conn load **`498.7 MB`** (`+223.3 MB`) · Post-load `490.0 MB`
- **Next.js 16.4.3 (`next`):**
  - **Run 1:** Idle `245.9 MB` · Peak under 200-conn load **`1,060.5 MB`** (`+814.6 MB`) · Post-load `1,060.5 MB`
  - **Run 2:** Idle `246.5 MB` · Peak under 200-conn load **`1,019.3 MB`** (`+772.8 MB`) · Post-load `1,019.4 MB`

---

## 5. Methodological Notes, Boundary Conditions & How to Reproduce

- **Percentile Calculation & `p95` (`p97.5` Upper Bound)**: Each published percentile is the **median of that percentile across the 5 independent rounds**. Because `autocannon` does not expose an exact `p95` bucket in its default HDR histogram, reported `p95` entries in `load.json` and `REPORT.md` represent `autocannon`'s `p97_5` (`p97.5`) upper bound.
- **Sequential TTFB (Unloaded) vs. Latency Under Load**: The `30` sequential TTFB probes per route are sampled **without concurrent load (`c = 1`)** between the `5s` warmup and the `5` concurrent load rounds, capturing baseline server processing time without event-loop queueing.
- **Colocated Client & Server (`loopback`)**: Both `autocannon` (`~0.7 vCPU`) and the single-process Node.js server (`~1.0 vCPU`) ran on the same 4-vCPU dedicated droplet over loopback (`127.0.0.1`), leaving `~2.0` dedicated vCPUs free for OS networking, `libuv`, and V8 GC (see [`report-infra.md`](./report-infra.md)).
- **Synthetic Delays & Single-Process Scope**: The `200 ms` (`/dashboard`, `/ppr`) and `80 ms` (`/rigorous/*`) delays simulate database/API latency without network jitter, and measurements reflect single-process Node.js execution (`node start.js` / `next start`). Full boundary conditions and step-by-step reproduction commands are documented in [`report-bench-structure.md`](./report-bench-structure.md#5-key-methodological-rules--measurement-nuances-scriptsloadmjs).

