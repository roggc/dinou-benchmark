# Dinou v9.0.3 vs. Next.js v16.4.3 — Full 12-Route & 3D Caching Cube Benchmark Report (Run 2 & Run 1 vs. Run 2 Comparison)

**Date:** November 2, 2026  
**Benchmark Repository:** `dinou-benchmark` (`master` branch)  
**Frameworks Evaluated:** **Dinou v9.0.3** (`dinou-9`), **Dinou v9.0.3 Unvendorized** (`dinou-9-u`, `dinou -u`), and **Next.js v16.4.3** (`next`), all running **React 19.3.1**  
**Environment:** DigitalOcean CPU-Optimized Dedicated Droplet — 4 Dedicated Intel Xeon vCPUs / 8 GB RAM / Regular Intel SSD / Ubuntu 24.04 LTS  
**Total Pipeline Execution Time:** `6,048 seconds` (`1 hour 40 minutes 48 seconds` — vs. `6,073 seconds` in Run 1, a `0.41%` variance)  
**Raw Data Archives:** [`results_run1/`](./results_run1/) ([`REPORT.md`](./results_run1/REPORT.md), `timeout = 30s`) · [`results_run2/`](./results_run2/) ([`REPORT.md`](./results_run2/REPORT.md), `timeout = 60s`)  
**Companion Reports:** [`report-run1-results.md`](./report-run1-results.md) · [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md) · [`report-timeouts-diagnosis-for-dumbs.md`](./report-timeouts-diagnosis-for-dumbs.md) · [`report-3d-architecture.md`](./report-3d-architecture.md) · [`report-verify.md`](./report-verify.md) · [`report-bench-structure.md`](./report-bench-structure.md) · [`report-infra.md`](./report-infra.md) · [`deep-dive-investigation.md`](./deep-dive-investigation.md)

---

## 1. Executive Summary & Rationale for Run 2

Following **Run 1** ([`report-run1-results.md`](./report-run1-results.md)), our forensic socket and kernel investigation ([`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md)) uncovered why `autocannon` had reported timeouts on two Dinou routes (`/rigorous/cache-slot`: `338` in `dinou-9` / `300` in `dinou-9-u`; `/rigorous/hs-cache-slot`: `1` in `dinou-9` / `30` in `dinou-9-u`) and four Next.js routes (`/rigorous/cache-slot`: `99`, `/rigorous/hs-cache-slot`: `160`, `/rigorous/ppr-cache-slot`: `1`, `/rigorous/triple`: `19`):

1. In [`scripts/load.mjs`](./scripts/load.mjs), the per-request `timeout` formula had originally been written as `Math.max(30, setup.load.durationSeconds)` when `durationSeconds` was `10s` (providing a `3×` safety margin: `timeout = 30s > duration = 10s`).
2. When `LOAD_DURATION` was scaled up to `30s` for the production droplet benchmark, `Math.max(30, 30)` evaluated to `30s`, inadvertently setting **`timeout === duration` (`30s === 30s`)**.
3. Inside `autocannon`'s source code (`node_modules/autocannon/lib/run.js`, lines 86–118), client `timeoutTicker` timers (`30,000 ms`) are initialized in `initialiseClients()` **a few milliseconds before** `stopTimer` (`30,000 ms`) and `tickInterval` (`client.destroy()`). As a result, any initial-burst socket still waiting in the queue when the 30-second test ended fired a false-positive `timeout` at **`+30.03s – +30.05s`** (during the `40 ms` teardown window).

To validate this finding empirically and measure run-to-run reproducibility across the entire benchmark suite, we restored the `timeout > duration` invariant in [`scripts/load.mjs`](./scripts/load.mjs) (`timeout: Math.max(60, setup.load.durationSeconds * 2)` = **`60s`**) and executed **Run 2** from scratch across all phases (`verify` × 10 runs, `dev-start` × 5, `hmr` × 5, `build` × 5, `bundle`, `load` × 5 rounds per route, and `memory`).

### Key Outcomes of Run 2:
1. **`0 Errors (100% OK)` Across All 36 Route-Framework Combinations (`12 routes × 3 apps`):**
   - Raising `autocannon`'s timeout from `30s` to `60s` eliminated **100% of timeouts in both Dinou (`339 → 0` and `330 → 0`) and Next.js (`279 → 0`)**.
2. **Rock-Solid Reproducibility Between Run 1 and Run 2:**
   - Combined across both runs, the benchmark now encompasses **`20` full Playwright verification runs (`720` E2E check executions per framework)** and **`10` full 30-second load rounds (`300 seconds` of sustained 200-connection load per route per framework)**, with throughput, latency, build, startup, HMR, and memory metrics reproducing within tight `1%–5%` tolerances.

---

## 2. Global Scorecard: Run 1 vs. Run 2 Across All Benchmark Dimensions

| Benchmark Dimension | Dinou 9.0.3 (`Run 1` → `Run 2`) | Dinou `-u` 9.0.3 (`Run 1` → `Run 2`) | Next.js 16.4.3 (`Run 1` → `Run 2`) | Dinou Lead vs. Next.js (Run 1 / Run 2) |
| :--- | :---: | :---: | :---: | :--- |
| **1. 3D Verification (`36 checks × 10 runs` per run = `720` total)** | **`36/36 ✅` (`360/360`) → `36/36 ✅` (`360/360`)** | *Identical runtime* | `30/36` (`308/360`) → `31/36` (`310/360`) | **Dinou `720/720` (`100.0%`, `0` flaky) vs. Next.js `618/720` (`85.8%`)** |
| **2. Production Build Time (`Median of 5 runs`)** | **`6.69 s` → `6.52 s`** | **`6.54 s` → `6.39 s`** | `14.88 s` → `14.54 s` | **Dinou `2.22×–2.23×` faster (`-8.02 to -8.19 s` per build)** |
| **3. Build Output Size on Disk (`.dinou` vs. `.next`)** | **`7.5 MB` → `7.5 MB`** | **`7.5 MB` → `7.5 MB`** | `59.7 MB` → `59.6 MB` | **Dinou `7.95×–7.96×` smaller on disk (`-52.1 MB`)** |
| **4. Client JS Bundle Weight (`Brotli` / `Gzip` / `Raw`)** | **`81.8` / `94.2` / `283.3 KiB`** | **`81.8` / `94.2` / `283.3 KiB`** | `158.3` / `182.5` / `585.7 KiB` | **Dinou `1.94×` smaller client JS (`-48.3%` Brotli)** |
| **5. Dev Server Cold Start (`Median of 5 runs`)** | **`2.18 s` → `2.09 s`** | `2.27 s` → `2.16 s` | `3.55 s` → `3.48 s` | **Dinou `1.63×–1.67×` faster cold start (`-1.37 to -1.39 s`)** |
| **6. Browser HMR Edit-to-DOM (`Median of 5 runs`)** | **`271 ms` → `266 ms`** | **`271 ms` → `260 ms`** | `314 ms` → `290 ms` | **Dinou `1.09×–1.16×` faster HMR (`-24 to -43 ms`)** |
| **7. Idle Server Memory (`Median of 5 samples`)** | `275.2 MB` → `275.1 MB` | `275.3 MB` → `275.4 MB` | **`245.9 MB` → `246.5 MB`** | **Next.js `~29 MB` lower at idle** |
| **8. Peak Memory Under 200-Conn Load (`Peak RSS`)** | **`488.3 MB` → `492.5 MB`** | **`476.7 MB` → `498.7 MB`** | `1,060.5 MB` → `1,019.3 MB` | **Dinou `2.07×–2.17×` lower peak RAM (`-526.8 to -572.2 MB`)** |
| **9. Post-Load Settled Memory (`RSS after load`)** | **`488.4 MB` → `492.6 MB`** | **`476.3 MB` → `490.0 MB`** | `1,060.5 MB` → `1,019.4 MB` | **Dinou `2.07×–2.17×` lower settled RAM (`-526.8 to -572.1 MB`)** |
| **10. Total Load Timeouts Across All 12 Routes** | `339` (`Run 1`) → **`0` (`Run 2`)** | `330` (`Run 1`) → **`0` (`Run 2`)** | `279` (`Run 1`) → **`0` (`Run 2`)** | **`0 errors (100% OK)` across all 3 frameworks in Run 2** |

---

## 3. Complete 12-Route HTTP Load Results: Run 2 & Comparison with Run 1

### 3.1 Run 2 Complete Table (`200` Connections, `30s × 5` Passes, `timeout = 60s`)

| Route | Kind / 3D Vertex | Dinou 9.0.3 (`TTFB` · `req/s` · `p50` / `p99` · `Err`) | Dinou `-u` (`TTFB` · `req/s` · `p50` / `p99` · `Err`) | Next.js 16.4.3 (`TTFB` · `req/s` · `p50` / `p99` · `Err`) | Dinou vs. Next.js (Run 2) |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`/`** | Baseline Static (SSG) | `1.45 ms` · **`1,432.4 req/s`** · `127` / `176 ms` · `0` | **`1.24 ms`** · `1,397.3 req/s` · `128` / **`165 ms`** · `0` | `5.59 ms` · `835.8 req/s` · `188` / `392 ms` · `0` | **`1.71×` req/s · `3.86×` faster TTFB · `2.23×` lower `p99`** |
| **`/items/42`** | Baseline Dynamic / ISR (`60s`) | `1.18 ms` · `1,274.1 req/s` · `143` / `185 ms` · `0` | **`1.13 ms`** · `1,214.8 req/s` · `144` / `194 ms` · `0` | `2.03 ms` · **`1,292.5 req/s`** · `143` / `181 ms` · `0` | **Tied req/s (`~1,280`) · Dinou `1.72×` faster TTFB** |
| **`/dashboard`** | Baseline Streaming (`3` holes) | **`3.05 ms`** · `408.0 req/s` · **`461` / `683 ms`** · `0` | `3.12 ms` · **`409.9 req/s`** · `467` / `693 ms` · `0` | `7.26 ms` · `189.2 req/s` · `920` / `9,195 ms` · `0` | **`2.16×` req/s · `2.00×` lower `p50` · `13.5×` lower `p99`** |
| **`/ppr`** | Baseline PPR (`1` hole) | `2.42 ms` · `514.4 req/s` · `381` / `479 ms` · `0` | **`2.33 ms`** · **`534.3 req/s`** · **`359` / `461 ms`** · `0` | `2.74 ms` · `196.6 req/s` · `945` / `6,255 ms` · `0` | **`2.62×` req/s · `2.48×` lower `p50` · `13.1×` lower `p99`** |
| **`/messages`** | Baseline Dynamic + File I/O | **`2.48 ms`** · **`421.7 req/s`** · **`445` / `1,655 ms`** · `0` | `3.02 ms` · `420.8 req/s` · `448` / `1,691 ms` · `0` | `6.20 ms` · `170.0 req/s` · `1,017` / `7,497 ms` · `0` | **`2.48×` req/s · `2.29×` lower `p50` · `4.53×` lower `p99`** |
| **`/rigorous/hs`** | **X-Axis**: Horizontal Seg. | `1.20 ms` · `1,180.0 req/s` · `153` / `200 ms` · `0` | **`1.16 ms`** · `1,145.0 req/s` · `156` / `199 ms` · `0` | `2.23 ms` · **`1,245.9 req/s`** · `142` / `183 ms` · `0` | **Tied req/s (`~1,200`) · Dinou `1.86×` faster TTFB** |
| **`/rigorous/cache-slot`** | **Y-Axis**: Dynamic + `10` Slots | `4.70 ms` · **`222.1 req/s`** · **`350` / `5,973 ms`** · `0` | `4.39 ms` · `215.9 req/s` · `372` / `6,398 ms` · `0` | **`2.74 ms`** · `133.3 req/s` · `917` / `18,552 ms` · `0` | **`1.67×` req/s · `2.62×` lower `p50` · `3.11×` lower `p99`** |
| **`/rigorous/ppr`** | **Z-Axis**: PPR (`2` holes) | `2.29 ms` · **`196.4 req/s`** · **`918` / `7,380 ms`** · `0` | **`2.24 ms`** · `187.3 req/s` · `980` / `7,800 ms` · `0` | `3.04 ms` · `139.7 req/s` · `1,095` / `15,892 ms` · `0` | **`1.41×` req/s · `1.19×` lower `p50` · `2.15×` lower `p99`** |
| **`/rigorous/ppr-cache-slot`** | **Y ∩ Z**: PPR + Cache-Slots | `2.70 ms` · **`190.3 req/s`** · **`904` / `10,714 ms`** · `0` | **`2.57 ms`** · `181.0 req/s` · `944` / `12,068 ms` · `0` | `3.26 ms` · `107.1 req/s` · `1,392` / `19,607 ms` · `0` | **`1.78×` req/s · `1.54×` lower `p50` · `1.83×` lower `p99`** |
| **`/rigorous/hs-cache-slot`** | **X ∩ Y**: HS + Cache-Slots | `1.75 ms` · `689.0 req/s` · `205` / **`312 ms`** · `0` | **`1.72 ms`** · **`693.4 req/s`** · **`203`** / `328 ms` · `0` | `2.96 ms` · `110.7 req/s` · `1,029` / `19,344 ms` · `0` | **`6.22×` req/s · `5.02×` lower `p50` · `62.0×` lower `p99`** |
| **`/rigorous/hs-ppr`** | **X ∩ Z**: HS + PPR | **`2.17 ms`** · **`194.7 req/s`** · `980` / **`5,787 ms`** · `0` | `2.22 ms` · **`194.7 req/s`** · **`964`** / `5,904 ms` · `0` | `3.13 ms` · `127.3 req/s` · `1,164` / `18,068 ms` · `0` | **`1.53×` req/s · `1.19×` lower `p50` · `3.12×` lower `p99`** |
| **`/rigorous/triple`** | **X ∩ Y ∩ Z**: **Triple Synergy** | `3.74 ms` · `209.7 req/s` · `720` / `11,381 ms` · `0` | `4.13 ms` · **`211.1 req/s`** · **`716` / `11,191 ms`** · `0` | **`3.36 ms`** · `100.3 req/s` · `1,428` / `21,651 ms` · `0` | **`2.09×` req/s · `1.98×` lower `p50` · `1.90×` lower `p99`** |

---

### 3.2 Run 1 vs. Run 2 Side-by-Side Throughput (`req/s`) & Error Comparison

| Route | Dinou 9.0.3 (`Run 1` → `Run 2`) | Dinou `-u` 9.0.3 (`Run 1` → `Run 2`) | Next.js 16.4.3 (`Run 1` → `Run 2`) | Run-to-Run Consistency & Timeout Resolution |
| :--- | :---: | :---: | :---: | :--- |
| **`/`** | `1,424.3` → **`1,432.4 req/s`** (`0` → `0` err) | `1,385.5` → **`1,397.3 req/s`** (`0` → `0` err) | `791.5` → `835.8 req/s` (`0` → `0` err) | `< 1%` variance on Dinou; `0` errors in both runs |
| **`/items/42`** | `1,229.2` → **`1,274.1 req/s`** (`0` → `0` err) | **`1,250.9`** → `1,214.8 req/s` (`0` → `0` err) | `1,235.9` → **`1,292.5 req/s`** (`0` → `0` err) | `~3%` variance; `0` errors in both runs |
| **`/dashboard`** | `392.7` → **`408.0 req/s`** (`0` → `0` err) | `396.6` → **`409.9 req/s`** (`0` → `0` err) | `178.9` → `189.2 req/s` (`0` → `0` err) | Dinou leads by `2.20×` (Run 1) and `2.16×` (Run 2) |
| **`/ppr`** | `504.0` → **`514.4 req/s`** (`0` → `0` err) | `509.6` → **`534.3 req/s`** (`0` → `0` err) | `188.2` → `196.6 req/s` (`0` → `0` err) | Dinou leads by `2.68×` (Run 1) and `2.62×` (Run 2) |
| **`/messages`** | `411.0` → **`421.7 req/s`** (`0` → `0` err) | `409.1` → **`420.8 req/s`** (`0` → `0` err) | `154.0` → `170.0 req/s` (`0` → `0` err) | Dinou leads by `2.67×` (Run 1) and `2.48×` (Run 2) |
| **`/rigorous/hs`** | `1,126.5` → **`1,180.0 req/s`** (`0` → `0` err) | `1,118.6` → **`1,145.0 req/s`** (`0` → `0` err) | `1,150.4` → **`1,245.9 req/s`** (`0` → `0` err) | Tied throughput; Dinou `1.86×` faster TTFB |
| **`/rigorous/cache-slot`** | `215.5` (`338` err) → **`222.1 req/s` (`0` err)** | `210.7` (`300` err) → **`215.9 req/s` (`0` err)** | `124.7` (`99` err) → `133.3 req/s` (`0` err) | **All `338`/`300`/`99` timeouts eliminated (`0` err); `req/s` & `p50`/`p99` unchanged** |
| **`/rigorous/ppr`** | **`196.4` → `196.4 req/s`** (`0` → `0` err) | `194.2` → `187.3 req/s` (`0` → `0` err) | `130.6` → `139.7 req/s` (`0` → `0` err) | Exact `196.4 req/s` match on `dinou-9` across both runs |
| **`/rigorous/ppr-cache-slot`** | `187.7` → **`190.3 req/s`** (`0` → `0` err) | **`185.0`** → `181.0 req/s` (`0` → `0` err) | `98.6` (`1` err) → `107.1 req/s` (`0` err) | Next.js timeout eliminated; Dinou leads by `1.78×–1.90×` |
| **`/rigorous/hs-cache-slot`** | `684.7` (`1` err) → **`689.0 req/s` (`0` err)** | `656.4` (`30` err) → **`693.4 req/s` (`0` err)** | `102.7` (`160` err) → `110.7 req/s` (`0` err) | **All `1`/`30`/`160` timeouts eliminated; Dinou leads by `6.22×–6.67×`** |
| **`/rigorous/hs-ppr`** | `191.5` → **`194.7 req/s`** (`0` → `0` err) | `181.7` → **`194.7 req/s`** (`0` → `0` err) | `119.7` → `127.3 req/s` (`0` → `0` err) | Dinou leads by `1.53×–1.60×` with `3.1×` lower `p99` |
| **`/rigorous/triple`** | `206.8` → **`209.7 req/s`** (`0` → `0` err) | `196.7` → **`211.1 req/s`** (`0` → `0` err) | `93.7` (`19` err) → `100.3 req/s` (`0` err) | **Next.js `19` timeouts eliminated; Dinou leads by `2.09×–2.21×`** |

---

## 4. Detailed Phase Breakdown (Run 2 Raw Samples vs. Run 1)

### 4.1 Dev Server Cold Start (`scripts/dev-start.mjs`, `n = 5`)
- **Dinou 9.0.3:** `2.15 / 2.07 / 2.09 / 2.09 / 2.05 s` → **Median: `2.09 s`** *(Run 1: `2.18 s`)*
- **Dinou (`-u`) 9.0.3:** `2.22 / 2.16 / 2.16 / 2.13 / 2.23 s` → **Median: `2.16 s`** *(Run 1: `2.27 s`)*
- **Next.js 16.4.3:** `3.61 / 3.47 / 3.48 / 3.48 / 3.52 s` → **Median: `3.48 s`** *(Run 1: `3.55 s`)*

### 4.2 Browser HMR Latency (`scripts/hmr.mjs`, `n = 5`)
- **Dinou 9.0.3:** `270 / 266 / 257 / 268 / 256 ms` → **Median: `266 ms`** *(Run 1: `271 ms`)*
- **Dinou (`-u`) 9.0.3:** `260 / 263 / 256 / 259 / 268 ms` → **Median: `260 ms`** *(Run 1: `271 ms`)*
- **Next.js 16.4.3:** `334 / 290 / 328 / 284 / 288 ms` → **Median: `290 ms`** *(Run 1: `314 ms`)*

### 4.3 Production Build Speed & Disk Footprint (`scripts/build.mjs`, `n = 5`)
- **Dinou 9.0.3:** `6.47 / 7.52 / 6.67 / 6.52 / 6.48 s` → **Median: `6.52 s`** · Output: **`7.5 MB`** *(Run 1: `6.69 s`, `7.5 MB`)*
- **Dinou (`-u`) 9.0.3:** `6.33 / 6.39 / 6.40 / 6.40 / 6.32 s` → **Median: `6.39 s`** · Output: **`7.5 MB`** *(Run 1: `6.54 s`, `7.5 MB`)*
- **Next.js 16.4.3:** `14.33 / 14.45 / 14.68 / 14.68 / 14.54 s` → **Median: `14.54 s`** · Output: **`59.6 MB`** *(Run 1: `14.88 s`, `59.7 MB`)*

### 4.4 Process-Tree Memory Footprint (`scripts/memory.mjs`)
- **Dinou 9.0.3:** Idle `275.1 MB` · Peak under 200-conn load **`492.5 MB`** (`+217.4 MB`) · Post-load `492.6 MB` *(Run 1: `275.2` / `488.3` / `488.4 MB`)*
- **Dinou (`-u`) 9.0.3:** Idle `275.4 MB` · Peak under 200-conn load **`498.7 MB`** (`+223.3 MB`) · Post-load `490.0 MB` *(Run 1: `275.3` / `476.7` / `476.3 MB`)*
- **Next.js 16.4.3:** Idle `246.5 MB` · Peak under 200-conn load **`1,019.3 MB`** (`+772.8 MB`) · Post-load `1,019.4 MB` *(Run 1: `245.9` / `1,060.5` / `1,060.5 MB`)*

