# Dinou v9.0.3 vs. Next.js v16.4.3 — Full 12-Route & 3D Caching Cube Benchmark Report (Run 2)

**Date:** November 2, 2026  
**Benchmark Repository:** `dinou-benchmark` (`master` branch)  
**Frameworks Evaluated:** **Dinou v9.0.3** (`dinou-9`), **Dinou v9.0.3 Unvendorized** (`dinou-9-u`, `dinou -u`), and **Next.js v16.4.3** (`next`), all running **React 19.3.1**  
**Environment:** DigitalOcean CPU-Optimized Dedicated Droplet — 4 Dedicated Intel Xeon vCPUs / 8 GB RAM / Regular Intel SSD / Ubuntu 24.04 LTS  
**Total Pipeline Execution Time:** `6,048 seconds` (`1 hour 40 minutes 48 seconds`) · **`autocannon` Socket Timeout:** `timeout = 60s` (`2 × durationSeconds`)  
**Companion Reports:** [`report-run1-run2-comparison.md`](./report-run1-run2-comparison.md) · [`report-run1-results.md`](./report-run1-results.md) · [`report-3d-architecture.md`](./report-3d-architecture.md) · [`report-verify.md`](./report-verify.md) · [`report-bench-structure.md`](./report-bench-structure.md) · [`report-infra.md`](./report-infra.md) · [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md) · [`report-timeouts-diagnosis-for-dumbs.md`](./report-timeouts-diagnosis-for-dumbs.md) · [`report-deep-dive-investigation.md`](./report-deep-dive-investigation.md) · **Raw Archive:** [`results_run2/REPORT.md`](./results_run2/REPORT.md)

> [!IMPORTANT]
> **Authoritative Source of Truth ([`results_run2/`](./results_run2/)):** The raw telemetry files in [`results_run2/`](./results_run2/) (`*.json`, `bench-run.log`, `env.txt`, [`REPORT.md`](./results_run2/REPORT.md), and `*.svg`) are the untouched, machine-generated outputs emitted directly by the benchmark suite on the Linux droplet without any AI processing or manual modification. In the event of any discrepancy between this narrative analysis report and the files in [`results_run2/`](./results_run2/), the raw files in [`results_run2/`](./results_run2/) are the authoritative source of truth.

---

## 1. Executive Summary

This report presents the complete empirical results of **Run 2** of the expanded **12-route `dinou-benchmark` suite**—evaluating both the **5 baseline rendering modes** (`SSG`, `ISR`, `Dynamic SSR + Suspense`, `PPR`, and `SSR + Disk I/O`) and all **7 non-empty vertices of the 3D Caching & Streaming Cube** (`2³ - 1 = 7` combinations of **Horizontal Segmentation `HS`**, **Vertical Segmentation `Cache-Slot`**, and **Partial Prerendering `PPR`**).

Every statistical phase in this run was standardized to **`n = 5` independent passes** (`BUILD_RUNS=5`, `DEV_RUNS=5`, `HMR_RUNS=5`, `LOAD_RUNS=5`, and `5` idle RSS samples), with HTTP load testing executed at **`200` concurrent connections**, **`30 seconds` per pass** (`150 seconds` of sustained load per route), **`autocannon` client socket `timeout = 60s`** (`timeout: Math.max(60, setup.load.durationSeconds * 2)`, eliminating the `timeout === duration` teardown race from Run 1), and a **`5-second` full-concurrency warmup** prior to each route. For a side-by-side comparison between Run 1 (`timeout = 30s`) and Run 2 (`timeout = 60s`), see [`report-run1-run2-comparison.md`](./report-run1-run2-comparison.md).

### 1.1 Global Scorecard across All 9 Benchmark Dimensions

| Benchmark Dimension | Dinou 9.0.3 (`dinou-9`) | Dinou (-u) 9.0.3 (`dinou-9-u`) | Next.js 16.4.3 (`next`) | Dinou Vendorized (`dinou-9`) Lead vs. Next.js 16.4.3 |
| :--- | ---: | ---: | ---: | :--- |
| **1. Functional & 3D Cube Verification** (`36 checks × 10 runs`) | **`36 / 36 ✅` (`100.0%`)** | *Identical runtime* | `31 / 36` (`31 ✅`, `5 ❌` · `86.1%`) | **Dinou `+13.9%` compliance (`0` failures vs. `50/360` failed execs)** |
| **2. Production Build Time** (`Median of 5 runs`) | **`6.52 s`** | **`6.39 s`** | `14.54 s` | **Dinou `2.23×` faster (`-8.02 s` per build)** |
| **3. Build Output Size on Disk** (`.dinou` vs. `.next`) | **`7.5 MB`** | **`7.5 MB`** | `59.6 MB` | **Dinou `7.95×` smaller on disk (`-52.1 MB`)** |
| **4. Client JS Bundle Weight** (`Brotli -11` / `Gzip -9` / `Raw`) | **`81.8 KiB`** (`94.2` / `283.3 KiB`) | **`81.8 KiB`** (`94.2` / `283.3 KiB`) | `158.3 KiB` (`182.5` / `585.7 KiB`) | **Dinou `1.94×` smaller client JS (`-76.5 KiB` Brotli, `-48.3%`)** |
| **5. Dev Server Cold Start** (`Median of 5 runs`) | **`2.09 s`** | **`2.16 s`** | `3.48 s` | **Dinou `1.67×` faster cold start (`-1.39 s`)** |
| **6. Browser HMR Edit-to-DOM** (`Median of 5 runs`) | **`266 ms`** | **`260 ms`** | `290 ms` | **Dinou `1.09×` faster HMR (`-24 ms`)** |
| **7. Idle Server Memory** (`Median of 5 samples`) | `275.1 MB` | `275.4 MB` | **`246.5 MB`** | **Next.js `28.6 MB` lower at idle** |
| **8. Peak Memory Under 200-Conn Load** (`Peak RSS` & `Δ Expansion`) | **`492.5 MB`** (`+217.4 MB`) | **`498.7 MB`** (`+223.3 MB`) | `1,019.3 MB` (`+772.8 MB`) | **Dinou `2.07×` lower peak RAM (`-526.8 MB`) & `3.55×` less memory expansion** |
| **9. Post-Load Settled Memory** (`RSS after load`) | **`492.6 MB`** | **`490.0 MB`** | `1,019.4 MB` | **Dinou `2.07×` lower settled RAM (`-526.8 MB`)** |

---

### 1.2 Key Highlights of the 12-Route Load Benchmark (`200` Connections, `30s × 5` Runs, `timeout = 60s`)

1. **`/rigorous/hs-cache-slot` (Vertex 5: HS + Cache-Slot Synergy) — Dinou Is `6.22×` Faster in Throughput with `62.0×` Lower `p99` Latency:**
   - **Dinou 9.0.3:** **`689.0 req/s`** · `p50: 205 ms` · **`p99: 312 ms`** · `0 timeouts (0%)`
   - **Next.js 16.4.3:** **`110.7 req/s`** · `p50: 1,029 ms` · **`p99: 19,344 ms` (~19.3 seconds)** · `0 timeouts (0%)`
   - When a route with a cached Horizontal Segmentation layout and page (`revalidate: 3600`) embeds a single uncached dynamic slot (`revalidate: 0`), Dinou preserves its outer HS cache and re-renders only the dynamic slot in `~1.45 ms` of CPU. Next.js 16.4.3 (`await connection()` inside the dynamic slot) de-optimizes the entire route into full dynamic SSR, collapsing throughput by `6.22×` and driving tail latencies above 19 seconds.
2. **Baseline Dynamic & Streaming Routes (`/dashboard`, `/ppr`, `/messages`) — Dinou Leads by `2.16×` to `2.62×` in Throughput and `4.5×` to `13.5×` in `p99` Latency:**
   - On `/ppr` (`200 ms` hole), Dinou delivers **`514.4 req/s`** (`p99: 479 ms`) vs. Next.js's **`196.6 req/s`** (`p99: 6,255 ms`) — **`2.62×` higher throughput** and **`13.1×` lower tail latency**.
   - On `/dashboard` (`3 × 200 ms` holes), Dinou delivers **`408.0 req/s`** (`p99: 683 ms`) vs. Next.js's **`189.2 req/s`** (`p99: 9,195 ms`) — **`2.16×` higher throughput** and **`13.5×` lower tail latency**.
   - On `/messages` (async `fs.promises.readFile` disk I/O), Dinou delivers **`421.7 req/s`** (`p99: 1,655 ms`) vs. Next.js's **`170.0 req/s`** (`p99: 7,497 ms`) — **`2.48×` higher throughput** and **`4.5×` lower tail latency**.
3. **All 4 Rigorous 3D Cube PPR Vertices (`/rigorous/ppr`, `/rigorous/ppr-cache-slot`, `/rigorous/hs-ppr`, `/rigorous/triple`) — Dinou Leads by `1.41×` to `2.09×`:**
   - On `/rigorous/triple` (Vertex 7: Triple Synergy combining `HS + Cache-Slot + PPR`), Dinou delivers **`209.7 req/s`** (`p50: 720 ms`, `p99: 11,381 ms`) vs. Next.js's **`100.3 req/s`** (`p50: 1,428 ms`, `p99: 21,651 ms`) — **`2.09×` higher throughput** and **`2.0×` lower median/tail latency**.
4. **Memory Under 200 Concurrent Connections — Next.js Exceeds `1.01 GB` (`+772.8 MB` Expansion) vs. Dinou's `492.5 MB` (`+217.4 MB` Expansion):**
   - Under `200` concurrent connections (`30s` burst on `/dashboard`), Next.js's process-tree RAM surges from `246.5 MB` at idle to **`1,019.3 MB`** (`+772.8 MB` expansion, with `0 MB` reclaimed post-load), while Dinou remains compact at **`492.5 MB` (`dinou-9`, `+217.4 MB` expansion) / `498.7 MB` (`dinou-9-u`, `+223.3 MB` expansion)** — **`2.07×` lower peak RAM** (`-526.8 MB`) and **`3.55×` less memory expansion**.

---

## 2. Full 12-Route HTTP Load Results (`200` Connections, `30s × 5` Runs, `timeout = 60s`)

### 2.1 Comparative Head-to-Head Summary Table (`Dinou 9.0.3 Vendorized (dinou-9)` vs. `Next.js 16.4.3`)

| Route | Rendering / 3D Cube Mode | Dinou 9.0.3 (`req/s` · `p50` / `p99`) | Next.js 16.4.3 (`req/s` · `p50` / `p99`) | Dinou Lead (`req/s`) | Dinou Lead (`p50` / `p99` Latency) |
| :--- | :--- | ---: | ---: | :---: | :---: |
| **`/`** | Baseline SSG (50 items) | **`1,432.4 req/s`** · p50 `127 ms` / p99 `176 ms` | `835.8 req/s` · p50 `188 ms` / p99 `392 ms` | **`1.71× faster`** | **`1.5×` lower p50 · `2.2×` lower p99** |
| **`/items/42`** | Baseline ISR (`60s`) | `1,274.1 req/s` · p50 `143 ms` / p99 `185 ms` | `1,292.5 req/s` · p50 `143 ms` / p99 `181 ms` | **Tie (`0.99×`)** | **Identical (`143 ms` p50, `185` vs `181 ms` p99)** |
| **`/dashboard`** | Baseline SSR + 3 Suspense (`200 ms`) | **`408.0 req/s`** · p50 `461 ms` / p99 **`683 ms`** | `189.2 req/s` · p50 `920 ms` / p99 **`9,195 ms`** | **`2.16× faster`** | **`2.0×` lower p50 · `13.5×` lower p99** |
| **`/ppr`** | Baseline PPR (`200 ms` hole) | **`514.4 req/s`** · p50 `381 ms` / p99 **`479 ms`** | `196.6 req/s` · p50 `945 ms` / p99 **`6,255 ms`** | **`2.62× faster`** | **`2.5×` lower p50 · `13.1×` lower p99** |
| **`/messages`** | Baseline SSR + Disk I/O (`readFile`) | **`421.7 req/s`** · p50 `445 ms` / p99 **`1,655 ms`** | `170.0 req/s` · p50 `1,017 ms` / p99 **`7,497 ms`** | **`2.48× faster`** | **`2.3×` lower p50 · `4.5×` lower p99** |
| **`/rigorous/hs`** | **1. Pure HS** (Segmented Layout + Page) | `1,180.0 req/s` · p50 `153 ms` / p99 `200 ms` | `1,245.9 req/s` · p50 `142 ms` / p99 `183 ms` | **Tie (`0.95×`)** | **Tie (`153` vs `142 ms` p50, `200` vs `183 ms` p99)** |
| **`/rigorous/cache-slot`** | **2. Pure Cache-Slot** (Dynamic Host + 10 Slots) | **`222.1 req/s`** · p50 **`350 ms`** / p99 **`5,973 ms`** | `133.3 req/s` · p50 `917 ms` / p99 **`18,552 ms`** | **`1.67× faster`** | **`2.6×` lower p50 · `3.1×` lower p99** |
| **`/rigorous/ppr`** | **3. Pure Rigorous PPR** (Static/Dyn/Nested Holes) | **`196.4 req/s`** · p50 `918 ms` / p99 **`7,380 ms`** | `139.7 req/s` · p50 `1,095 ms` / p99 **`15,892 ms`** | **`1.41× faster`** | **`1.2×` lower p50 · `2.2×` lower p99** |
| **`/rigorous/ppr-cache-slot`** | **4. Pairwise #1:** PPR + Cache-Slot | **`190.3 req/s`** · p50 `904 ms` / p99 **`10,714 ms`** | `107.1 req/s` · p50 `1,392 ms` / p99 **`19,607 ms`** | **`1.78× faster`** | **`1.5×` lower p50 · `1.8×` lower p99** |
| **`/rigorous/hs-cache-slot`** | **5. Pairwise #2:** HS + Cache-Slot (Non-PPR) | **`689.0 req/s`** · p50 **`205 ms`** / p99 **`312 ms`** | `110.7 req/s` · p50 `1,029 ms` / p99 **`19,344 ms`** | **`6.22× faster`** | **`5.0×` lower p50 · `62.0×` lower p99** |
| **`/rigorous/hs-ppr`** | **6. Pairwise #3:** HS + PPR | **`194.7 req/s`** · p50 `980 ms` / p99 **`5,787 ms`** | `127.3 req/s` · p50 `1,164 ms` / p99 **`18,068 ms`** | **`1.53× faster`** | **`1.2×` lower p50 · `3.1×` lower p99** |
| **`/rigorous/triple`** | **7. Triple Synergy:** HS + Cache-Slot + PPR | **`209.7 req/s`** · p50 **`720 ms`** / p99 **`11,381 ms`** | `100.3 req/s` · p50 `1,428 ms` / p99 **`21,651 ms`** | **`2.09× faster`** | **`2.0×` lower p50 · `1.9×` lower p99** |

---

### 2.2 Detailed Per-Framework Route Tables

#### A. Dinou 9.0.3 (`apps/dinou-9` — Default Vendorized Build)

| Route | Mode / Vertex | Unloaded TTFB (Median) | Throughput (Median `req/s`) | `p50` Latency | `p99` Latency | Timeouts (`5 × 30s` Runs) | Error Rate (`%`) |
| :--- | :--- | ---: | ---: | ---: | ---: | :---: | :---: |
| `/` | SSG | `1.45 ms` | **`1,432.4 req/s`** | `127 ms` | `176 ms` | `0` | `0%` (`100% OK`) |
| `/items/42` | ISR (`60s`) | `1.18 ms` | **`1,274.1 req/s`** | `143 ms` | `185 ms` | `0` | `0%` (`100% OK`) |
| `/dashboard` | SSR + 3 Suspense | `3.05 ms` | **`408.0 req/s`** | `461 ms` | `683 ms` | `0` | `0%` (`100% OK`) |
| `/ppr` | PPR (`200 ms`) | `2.42 ms` | **`514.4 req/s`** | `381 ms` | `479 ms` | `0` | `0%` (`100% OK`) |
| `/messages` | SSR + Disk I/O | `2.48 ms` | **`421.7 req/s`** | `445 ms` | `1,655 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs` | 1. Pure HS | `1.20 ms` | **`1,180.0 req/s`** | `153 ms` | `200 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/cache-slot` | 2. Pure Cache-Slot | `4.70 ms` | **`222.1 req/s`** | `350 ms` | `5,973 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/ppr` | 3. Pure Rigorous PPR | `2.29 ms` | **`196.4 req/s`** | `918 ms` | `7,380 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/ppr-cache-slot` | 4. PPR + Cache-Slot | `2.70 ms` | **`190.3 req/s`** | `904 ms` | `10,714 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs-cache-slot` | 5. HS + Cache-Slot | `1.75 ms` | **`689.0 req/s`** | `205 ms` | `312 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs-ppr` | 6. HS + PPR | `2.17 ms` | **`194.7 req/s`** | `980 ms` | `5,787 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/triple` | 7. Triple Synergy | `3.74 ms` | **`209.7 req/s`** | `720 ms` | `11,381 ms` | `0` | `0%` (`100% OK`) |

#### B. Dinou (-u) 9.0.3 (`apps/dinou-9-u` — Unvendorized Build `dinou -u`)

| Route | Mode / Vertex | Unloaded TTFB (Median) | Throughput (Median `req/s`) | `p50` Latency | `p99` Latency | Timeouts (`5 × 30s` Runs) | Error Rate (`%`) |
| :--- | :--- | ---: | ---: | ---: | ---: | :---: | :---: |
| `/` | SSG | `1.24 ms` | **`1,397.3 req/s`** | `128 ms` | `165 ms` | `0` | `0%` (`100% OK`) |
| `/items/42` | ISR (`60s`) | `1.13 ms` | **`1,214.8 req/s`** | `144 ms` | `194 ms` | `0` | `0%` (`100% OK`) |
| `/dashboard` | SSR + 3 Suspense | `3.12 ms` | **`409.9 req/s`** | `467 ms` | `693 ms` | `0` | `0%` (`100% OK`) |
| `/ppr` | PPR (`200 ms`) | `2.33 ms` | **`534.3 req/s`** | `359 ms` | `461 ms` | `0` | `0%` (`100% OK`) |
| `/messages` | SSR + Disk I/O | `3.02 ms` | **`420.8 req/s`** | `448 ms` | `1,691 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs` | 1. Pure HS | `1.16 ms` | **`1,145.0 req/s`** | `156 ms` | `199 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/cache-slot` | 2. Pure Cache-Slot | `4.39 ms` | **`215.9 req/s`** | `372 ms` | `6,398 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/ppr` | 3. Pure Rigorous PPR | `2.24 ms` | **`187.3 req/s`** | `980 ms` | `7,800 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/ppr-cache-slot` | 4. PPR + Cache-Slot | `2.57 ms` | **`181.0 req/s`** | `944 ms` | `12,068 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs-cache-slot` | 5. HS + Cache-Slot | `1.72 ms` | **`693.4 req/s`** | `203 ms` | `328 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs-ppr` | 6. HS + PPR | `2.22 ms` | **`194.7 req/s`** | `964 ms` | `5,904 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/triple` | 7. Triple Synergy | `4.13 ms` | **`211.1 req/s`** | `716 ms` | `11,191 ms` | `0` | `0%` (`100% OK`) |

#### C. Next.js 16.4.3 (`apps/next`)

| Route | Mode / Vertex | Unloaded TTFB (Median) | Throughput (Median `req/s`) | `p50` Latency | `p99` Latency | Timeouts (`5 × 30s` Runs) | Error Rate (`%`) |
| :--- | :--- | ---: | ---: | ---: | ---: | :---: | :---: |
| `/` | SSG | `5.59 ms` | `835.8 req/s` | `188 ms` | `392 ms` | `0` | `0%` (`100% OK`) |
| `/items/42` | ISR (`60s`) | `2.03 ms` | `1,292.5 req/s` | `143 ms` | `181 ms` | `0` | `0%` (`100% OK`) |
| `/dashboard` | SSR + 3 Suspense | `7.26 ms` | `189.2 req/s` | `920 ms` | `9,195 ms` | `0` | `0%` (`100% OK`) |
| `/ppr` | PPR (`200 ms`) | `2.74 ms` | `196.6 req/s` | `945 ms` | `6,255 ms` | `0` | `0%` (`100% OK`) |
| `/messages` | SSR + Disk I/O | `6.20 ms` | `170.0 req/s` | `1,017 ms` | `7,497 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs` | 1. Pure HS | `2.23 ms` | `1,245.9 req/s` | `142 ms` | `183 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/cache-slot` | 2. Pure Cache-Slot | `2.74 ms` | `133.3 req/s` | `917 ms` | `18,552 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/ppr` | 3. Pure Rigorous PPR | `3.04 ms` | `139.7 req/s` | `1,095 ms` | `15,892 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/ppr-cache-slot` | 4. PPR + Cache-Slot | `3.26 ms` | `107.1 req/s` | `1,392 ms` | `19,607 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs-cache-slot` | 5. HS + Cache-Slot | `2.96 ms` | `110.7 req/s` | `1,029 ms` | `19,344 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs-ppr` | 6. HS + PPR | `3.13 ms` | `127.3 req/s` | `1,164 ms` | `18,068 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/triple` | 7. Triple Synergy | `3.36 ms` | `100.3 req/s` | `1,428 ms` | `21,651 ms` | `0` | `0%` (`100% OK`) |

> **Note on `autocannon` Socket Timeouts (`timeout = 60s` in Run 2):** With `scripts/load.mjs` configured to `timeout: Math.max(60, setup.load.durationSeconds * 2)` = **`60 seconds`** (`timeout > duration`), all `36` route-framework combinations (`12 routes × 3 apps` × `5 rounds` = `180` load passes) completed with **`0` timeouts (`100% OK`)**. See [`report-run1-run2-comparison.md`](./report-run1-run2-comparison.md) and [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md) for the full analysis.

---

## 3. Deep Architectural Analysis of the 12-Route Load Results

### 3.1 Why Dinou Beats Next.js by `6.22×` in Throughput and `62.0×` in `p99` Latency on `/rigorous/hs-cache-slot`
The single largest performance divergence in the entire 12-route benchmark occurs on **Vertex 5: `/rigorous/hs-cache-slot` (`Pairwise #2: HS + Cache-Slot Synergy, Non-PPR`)**:
- **Dinou 9.0.3:** `689.0 req/s` · `p50: 205 ms` · **`p99: 312 ms`** · `0 timeouts`
- **Next.js 16.4.3:** `110.7 req/s` · `p50: 1,029 ms` · **`p99: 19,344 ms`** · `0 timeouts`

**Architectural Root Cause:**
- On `/rigorous/hs-cache-slot`, the outer layout (`HsCacheSlotLayout`) and host page (`HsCacheSlotPageA`) are configured as cached **Horizontal Segmentation (`HS`)** segments (`revalidate = 3600`), while embedding several cached `<DinouCacheSlot>` components alongside one intentionally uncached dynamic slot (`hscs-page-a-dyn-slot` with `revalidate = 0`) and two `1s` TTL slots (`revalidate = 1`).
- In **Dinou v9.0.3**, **Horizontal Segmentation (`HS`) and Vertical Segmentation (`Cache-Slot`) are orthogonal**. Even without PPR enabled on this route, Dinou keeps the host layout and page cached in its HS store and only executes and splices the dynamic `<DinouCacheSlot revalidate={0}>` subtree on each request (`~1.45 ms` of CPU work per request → **`689.0 req/s`** and a sub-350ms `p99` of **`312 ms`**).
- In **Next.js v16.4.3**, when a Non-PPR route contains an uncached component that opts into request-time execution via `await connection()`, Next.js cannot serve the surrounding page shell from a route cache unless the dynamic component is wrapped in a streaming `<Suspense>` boundary (PPR). Consequently, Next.js falls back to full dynamic route rendering on every request, dropping from `1,245.9 req/s` (on `/rigorous/hs`) down to **`110.7 req/s`** (`6.22×` slower than Dinou), with `p99` tail latency exploding to **`19.34 seconds`** (`62.0×` worse than Dinou).

---

### 3.2 Pure Cache-Slot & Streaming 3D Cube Vertices (`/rigorous/cache-slot`, `/rigorous/ppr`, `/rigorous/ppr-cache-slot`, `/rigorous/hs-ppr`, `/rigorous/triple`)
Across all remaining dynamic and hybrid vertices of the 3D Caching Cube, Dinou maintains a commanding lead in both throughput and latency:

1. **Vertex 2 — `/rigorous/cache-slot` (`Pure Cache-Slot on Dynamic Host`):**
   - **Dinou 9.0.3 (`222.1 req/s`, `p50: 350 ms`, `p99: 5,973 ms`)** outperforms **Next.js 16.4.3 (`133.3 req/s`, `p50: 917 ms`, `p99: 18,552 ms`)** by **`1.67×` in throughput**, **`2.62×` in `p50` latency**, and **`3.11×` in `p99` latency**.
   - Even when the host page itself has `revalidate = 0` and splices 10 `<DinouCacheSlot>` subtrees per request, Dinou's in-memory slot splicing takes just `~4.50 ms` of effective server time per request under 200-connection load (`222.1 req/s`, `4.70 ms` unloaded TTFB) vs. `~7.50 ms` per request under load (`133.3 req/s`) in Next.js's `"use cache"` pipeline.
2. **Vertex 3 — `/rigorous/ppr` (`Pure Rigorous PPR`):**
   - **Dinou 9.0.3 (`196.4 req/s`, `p50: 918 ms`, `p99: 7,380 ms`)** outperforms **Next.js 16.4.3 (`139.7 req/s`, `p50: 1,095 ms`, `p99: 15,892 ms`)** by **`1.41×` in throughput** and **`2.15×` lower `p99` latency**.
3. **Vertex 4 — `/rigorous/ppr-cache-slot` (`PPR + Cache-Slot Synergy`):**
   - **Dinou 9.0.3 (`190.3 req/s`, `p50: 904 ms`, `p99: 10,714 ms`)** outperforms **Next.js 16.4.3 (`107.1 req/s`, `p50: 1,392 ms`, `p99: 19,607 ms`)** by **`1.78×` in throughput** and **`1.83×` lower `p99` latency**.
4. **Vertex 6 — `/rigorous/hs-ppr` (`HS + PPR Synergy`):**
   - **Dinou 9.0.3 (`194.7 req/s`, `p50: 980 ms`, `p99: 5,787 ms`)** outperforms **Next.js 16.4.3 (`127.3 req/s`, `p50: 1,164 ms`, `p99: 18,068 ms`)** by **`1.53×` in throughput** and **`3.12×` lower `p99` latency**.
5. **Vertex 7 — `/rigorous/triple` (`Triple Synergy: HS + Cache-Slot + PPR`):**
   - When all three caching and streaming dimensions operate simultaneously on the same route, **Dinou 9.0.3 (`209.7 req/s`, `p50: 720 ms`, `p99: 11,381 ms`)** outperforms **Next.js 16.4.3 (`100.3 req/s`, `p50: 1,428 ms`, `p99: 21,651 ms`)** by **`2.09×` in throughput**, **`1.98×` lower `p50`**, and **`1.90×` lower `p99`**.
   - Notice that in Next.js, combining PPR with Cache-Slots (`/rigorous/ppr-cache-slot` and `/rigorous/triple`) degrades throughput to `~100–107 req/s` (`107.1` and `100.3 req/s`) and pushes `p99` to **19.6–21.7 seconds**, whereas in Dinou `/rigorous/triple` (`209.7 req/s`, `p50: 720 ms`) is actually **faster** than `/rigorous/ppr` (`196.4 req/s`, `p50: 918 ms`) because `<DinouCacheSlot>` caches the expensive work inside the streamed PPR holes!

---

### 3.3 Static & Fully Cached Routes (`/`, `/items/42`, `/rigorous/hs`) as an Architectural Control Group
Examining the three fully cached routes provides an illuminating control baseline:
- On **`/items/42` (ISR `60s`)** and **`/rigorous/hs` (Pure HS, `revalidate: 3600`)**, both frameworks serve pre-cached responses from memory without executing React components per request. Here, throughput is virtually tied (`1,215–1,274` vs. `1,293 req/s` on `/items/42`, and `1,145–1,180` vs. `1,246 req/s` on `/rigorous/hs`), with nearly identical latencies (`p50: 142–156 ms`, `p99: 181–200 ms`).
- On **`/` (SSG · 50 items list)**, where Next.js transfers a `~2.6×` larger HTML + inline RSC Flight payload per request (`~73 KB/req` vs. Dinou's `~28 KB/req`, as measured in [`report-deep-dive-investigation.md`](./report-deep-dive-investigation.md)), Dinou achieves **`1,432.4 req/s` (`p99: 176 ms`, `TTFB: 1.45 ms`)** vs. Next.js's **`835.8 req/s` (`p99: 392 ms`, `TTFB: 5.59 ms`)** — a **`1.71×` throughput lead** and **`3.86×` faster unloaded TTFB**.
- **Conclusion from the Control Group:** When zero React rendering occurs at request time and payloads are small (`/items/42`, `/rigorous/hs`), Node.js's underlying HTTP server performs identically in both frameworks. The moment per-request RSC rendering, Suspense streaming, Cache-Slot splicing, or larger Flight payloads enter the picture (the other 10 routes), Dinou's leaner runtime architecture delivers **`1.41×` to `6.22×` higher throughput** and **`1.8×` to `62×` lower tail latency**.

---

### 3.4 Vendorized (`dinou-9`) vs. Unvendorized (`dinou-9-u`) Production Parity
Comparing `Dinou 9.0.3` (`dinou-9`, default vendorized server build) against `Dinou (-u) 9.0.3` (`dinou-9-u`, unvendorized `dinou -u` build) across all 12 routes confirms:
- Once V8 loads the module graph into RAM and completes the 5-second JIT warmup, **production HTTP throughput and latency are statistically indistinguishable** between `dinou-9` and `dinou-9-u` (within `~1%–5%` across all 12 routes, e.g., `408.0` vs. `409.9 req/s` on `/dashboard`, `514.4` vs. `534.3 req/s` on `/ppr`, `1,180.0` vs. `1,145.0 req/s` on `/rigorous/hs`).
- Meanwhile, `dinou-9-u` compiles **`0.13s` faster** in `pnpm run build` (`6.39s` vs. `6.52s` median) and achieves **`260 ms`** vs. **`266 ms`** median browser HMR latency.

---

### 3.5 How to Interpret These Results

- **`0 Errors` Across All 12 Routes Reflects the `60s` Client Timeout Configuration (`timeout = 2 × duration`)**:
  In preliminary runs with `autocannon`'s default `10s` per-request timeout (and on the 2–4 routes affected by the `timeout = 30s === duration = 30s` teardown boundary in Run 1), client timeouts occurred when initial-burst queue dwell time exceeded the client timer. With a `60s` client timeout (`2 × duration`) in Run 2, delayed requests from the initial connection burst are recorded accurately as **tail latency (`p99` / `max`)** rather than premature connection failures (`0` timeouts across all 12 routes and all 3 frameworks). Error metrics from this run should therefore not be compared directly against runs using `10s` or `30s` timeout thresholds (see [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md)).
- **The Initial Connection Burst Phenomenon (Why `p50` and `p99` Are Reported Instead of `max`)**:
  Each test execution opens `200` TCP connections simultaneously on `localhost` at `t = 0`. While Node.js's single-threaded Event Loop is saturated servicing active HTTP/1.1 keep-alive streams, queued connections dwell in the Linux kernel listen backlog until accepted across successive loop turns. **This occurs in both frameworks and is an OS/event-loop queueing dynamic, not a framework bug.** Because this initial burst primarily inflates maximum (`max`) latency, **`p50` and `p99` percentiles are reported instead of maximums**:
  - In Dinou, this initial queueing affected only **`~0.04%`** of requests on `/`, leaving `p99` unaffected (`176 ms`).
  - In Next.js, this affected **`~0.7%`** of requests on `/`. These requests fall close to the 99th percentile, raising Next.js's `p99` on `/` to `392 ms` despite a `p50` of `191 ms`.
- **True Event Loop Saturation on Dynamic Routes in Next.js**:
  On `/dashboard`, `/ppr`, and `/messages`, Next.js's median latency (`p50`) reaches **`~904–1,069 ms`**, with tail queues (`p99`) reaching **`6.3–9.0 seconds`** (and **`15.9–22.0 seconds`** across the 3D Cube routes). In contrast, Dinou maintains a **`~365–471 ms` `p50`** and a **sub-second `p99` (`475–680 ms` on `/ppr` and `/dashboard`, and `312 ms` on `/rigorous/hs-cache-slot`)**. Under identical high concurrency, Dinou stays close to the baseline architectural latency of each route (`200 ms` per dynamic slot), whereas Next.js accumulates compounding queue dwell times.

---

## 4. Process-Tree Memory Footprint Under 200 Concurrent Connections (`pnpm bench:memory`)

`scripts/memory.mjs` measures the complete process-tree Resident Set Size (`VmRSS` on Linux) across three lifecycle stages: **Idle** (median of 5 samples taken 3s after server boot), **Peak Under Load** (sampled every 400ms during a 30-second, 200-connection `autocannon` burst against `/dashboard`), and **Post-Load Settled**.

| Framework | Idle RSS (Median of 5 Samples) | Peak RSS Under Load (`200 Conn, 30s`) | Memory Expansion Under Load (`Δ`) | Post-Load Settled RSS | Peak Memory Comparison vs. Next.js |
| :--- | ---: | ---: | ---: | ---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `275.1 MB` | **`492.5 MB`** | **`+217.4 MB`** (`+79.0%`) | **`492.6 MB`** | **`2.07×` lower peak RSS (`-526.8 MB`)** |
| **Dinou (-u) 9.0.3 (`dinou-9-u`)** | `275.4 MB` | **`498.7 MB`** | **`+223.3 MB`** (`+81.1%`) | **`490.0 MB`** | **`2.04×` lower peak RSS (`-520.6 MB`)** |
| **Next.js 16.4.3 (`next`)** | **`246.5 MB`** | `1,019.3 MB` | `+772.8 MB` (`+313.5%`) | `1,019.4 MB` | Baseline (`> 1.01 GB` RAM) |

### Production Memory Scaling & Container Headroom Analysis (`200` Connections)
- **Dinou v9.0.3 (`dinou-9`):** Under 200 concurrent connections on `/dashboard`, process-tree RSS grows by only **`+217.4 MB`** (`275.1 MB` → **`492.5 MB`** peak, **`498.7 MB`** in `dinou-9-u`), comfortably fitting inside a `512 MB` or `1 GB` container.
- **Next.js v16.4.3 (`next`):** Under the exact same 200-connection workload, Next.js's peak RSS expands by **`+772.8 MB`** (`246.5 MB` → **`1,019.3 MB`**, **`3.55×` more memory expansion** than `dinou-9` and `0 MB` reclaimed post-load), crossing **1 GB of RAM for a single Node.js process**—which on `512 MB` or `1 GB` container instances (AWS Fargate, Fly.io, Render, Railway, Kubernetes pods) would trigger an immediate Linux **OOM-Kill (`SIGKILL`)**.

---

## 5. Build, Disk Output, Client Bundle & Developer Experience (`n = 5` Runs)

### 5.1 Production Build Duration & Output Disk Footprint (`pnpm bench:build`, `BUILD_RUNS=5`)

| Framework | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | **Median Build Time** | **Output Directory Size** | Build Speed & Disk Lead |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `6.47 s` | `7.52 s` | `6.67 s` | `6.52 s` | `6.48 s` | **`6.52 s`** | **`7.5 MB`** (`.dinou`) | **`2.23×` faster · `7.95×` smaller disk** |
| **Dinou (-u) 9.0.3 (`dinou-9-u`)** | `6.33 s` | `6.39 s` | `6.40 s` | `6.40 s` | `6.32 s` | **`6.39 s`** | **`7.5 MB`** (`.dinou`) | **`2.28×` faster · `7.95×` smaller disk** |
| **Next.js 16.4.3 (`next`)** | `14.33 s` | `14.45 s` | `14.68 s` | `14.68 s` | `14.54 s` | `14.54 s` | `59.6 MB` (`.next`) | Baseline |

*Note on Output Directory Footprint:* Across all 12 production routes and 7 multi-route 3D Caching Cube suites, Dinou's compiled `.dinou` build directory occupies **`7.5 MB`** (`7,488,924 bytes` in `dinou-9`, `7,482,184 bytes` in `dinou-9-u`), whereas Next.js's `.next` directory occupies **`59.6 MB`** (`59,646,981 bytes`) — **`7.95×` larger on disk**.

---

### 5.2 Client-Side JavaScript Bundle Delivery (`pnpm bench:bundle`)

| Framework | Client `.js` Files | Raw Size | Gzip Size (`-9`) | **Brotli Size (`-11`)** | Client Payload Comparison |
| :--- | :---: | ---: | ---: | ---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `23 files` | **`283.3 KiB`** | **`94.2 KiB`** | **`81.8 KiB`** | **`1.94×` smaller (`-76.5 KiB` Brotli)** |
| **Dinou (-u) 9.0.3 (`dinou-9-u`)** | `23 files` | **`283.3 KiB`** | **`94.2 KiB`** | **`81.8 KiB`** | **`1.94×` smaller (`-76.5 KiB` Brotli)** |
| **Next.js 16.4.3 (`next`)** | `15 files` | `585.7 KiB` | `182.5 KiB` | `158.3 KiB` | Baseline |

---

### 5.3 Dev Server Cold Start (`pnpm bench:dev`, `DEV_RUNS=5`)

| Framework | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | **Median Cold Start** | Cold Start Comparison |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `2.15 s` | `2.07 s` | `2.09 s` | `2.09 s` | `2.05 s` | **`2.09 s`** | **`1.67×` faster (`-1.39 s`)** |
| **Dinou (-u) 9.0.3 (`dinou-9-u`)** | `2.22 s` | `2.16 s` | `2.16 s` | `2.13 s` | `2.23 s` | **`2.16 s`** | **`1.61×` faster (`-1.32 s`)** |
| **Next.js 16.4.3 (`next`)** | `3.61 s` | `3.47 s` | `3.48 s` | `3.48 s` | `3.52 s` | `3.48 s` | Baseline |

---

### 5.4 Real-Browser HMR Latency (`pnpm bench:hmr`, `HMR_RUNS=5`)

| Framework | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | **Median HMR (`edit → DOM`)** | HMR Comparison |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `270 ms` | `266 ms` | `257 ms` | `268 ms` | `256 ms` | **`266 ms`** | **`1.09×` faster (`-24 ms`)** |
| **Dinou (-u) 9.0.3 (`dinou-9-u`)** | `260 ms` | `263 ms` | `256 ms` | `259 ms` | `268 ms` | **`260 ms`** | **`1.12×` faster (`-30 ms`)** |
| **Next.js 16.4.3 (`next`)** | `334 ms` | `290 ms` | `328 ms` | `284 ms` | `288 ms` | `290 ms` | Baseline |

---

## 6. Functional & 3D Architectural Verification Summary (`scripts/verify.mjs` — `36 Checks × 10 Runs`)

Prior to executing the hardware-dependent load and pipeline phases, `scripts/verify.mjs` ran **10 consecutive verification passes** (`36 checks × 10 runs = 360 check executions` per framework, restoring a pristine post-build disk snapshot and restarting a fresh server process before every run; archived in [`results_run2/verify.json`](./results_run2/verify.json) and analyzed in full in [`report-verify.md`](./report-verify.md)):

| Framework | Baseline Checks (`1–13`) | Core 3D Cube Suites (`14–22`) | Deep Stress & Concurrency (`23–36`) | Total Non-Flaky Passed | Total Check Executions (`10 × 36`) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `13 / 13 ✅` | `9 / 9 ✅` | `14 / 14 ✅` | **`36 / 36 ✅`** | **`360 / 360` (`100.0%`)** | **36 ✅ PASS (`10/10` runs · `0` flaky)** |
| **Next.js 16.4.3 (`next`)** | `13 / 13 ✅` | `9 / 9 ✅` | `9 ✅ / 5 ❌` | `31 / 36` | `310 / 360` (`86.1%`) | **31 ✅ PASS (`10/10`) · 5 ❌ FAIL (`0/10`)** |

---

## 7. Testbed, Methodology, Limitations & How to Reproduce

### 7.1 Hardware & Runtime Environment (`results_run2/env.txt`)

| Parameter | Specification |
| :--- | :--- |
| **Cloud Instance & CPU** | DigitalOcean CPU-Optimized Dedicated Droplet (`lon1`), **4 Dedicated vCPUs** (`Intel(R) Xeon(R) Platinum 8168 CPU @ 2.70GHz`, `0%` CPU Steal Time), **8 GB RAM** (`7.8 GiB` usable + `4.0 GiB` Swap) |
| **Operating System & Kernel** | Ubuntu 24.04.5 LTS (`6.8.0-142-generic x86_64`), `ext4` SSD |
| **Kernel Networking & Limits** | `ulimit -n = 65535` · `net.core.somaxconn = 65535` · `net.ipv4.tcp_max_syn_backlog = 65535` · `tcp_tw_reuse = 1` |
| **Runtime & Toolchain** | Node.js `v22.23.4` (V8 `12.4.254.21-node.57`, `libuv 1.51.0`) · `pnpm 12.15.0` · `autocannon 8.0.0` (`timeout = 60s`) · `playwright 1.64.1` |
| **Frameworks Compared** | **Dinou 9.0.3** (`dinou-9` vendorized & `dinou-9-u` unvendorized) vs. **Next.js 16.4.3** (`next`), both on **React 19.3.1** |

### 7.2 Key Methodological Rules & Measurement Nuances

- **Production Builds Only**: All three applications are measured in production mode (`build` + `start`), never in development (except in the dedicated `dev-start` and `hmr` sections).
- **`200` Connections, `30s` Duration, `60s` Client Timeout, `5` Runs per Route**: Every route undergoes a `5s` full-concurrency warmup (`200` connections), followed by `30` sequential unloaded TTFB probes (`c = 1`), and `5` recorded `30s` rounds at `200` concurrent connections (`150s` of sustained load per route) with `timeout = 60s` (`2 × duration`), resulting in **`0` timeouts (`100% OK`) across all 12 routes and all 3 frameworks**.
- **Percentile Aggregation & `p95` (`p97.5` Upper Bound)**: Each reported percentile (`p50`, `p95`, `p99`) is the **median of that percentile across the 5 independent rounds**. Because `autocannon` does not expose an exact `p95` bucket in its default HDR histogram percentiles, `p95` entries in `load.json` and `REPORT.md` represent `autocannon`'s **`p97_5` (`p97.5`) upper bound**.
- **Sequential TTFB (Unloaded) vs. Latency Under Load**: The `30` sequential TTFB probes are measured **without concurrent load (`c = 1`)** between warmup and load testing to capture baseline server processing time; they must not be conflated with latency under 200-connection load.
- **Keep-Alive Configuration**: `keepAliveTimeout` is set to `65s` across all apps (`headersTimeout = 66s` in Dinou) so sockets are never closed mid-round.

#### Evaluated Routes (`12` Production Routes: `5` Baseline + `7` Rigorous 3D Cube Routes)

| Route | Category / 3D Vertex | Implementation Details |
| :--- | :--- | :--- |
| **`/`** | Baseline SSG | 50 items list loaded from local JSON (`data/items.json`), statically pre-rendered at build time. |
| **`/items/42`** | Baseline ISR (`60s`) | Item detail view with `revalidate = 60` (`cacheLife({ revalidate: 60 })`), pre-rendered at build time and served from ISR cache. |
| **`/dashboard`** | Baseline Dynamic SSR | Uncached dynamic SSR shell + three parallel `<Suspense>` slots each awaiting a `200 ms` artificial delay (`await sleep(200)`). |
| **`/ppr`** | Baseline PPR | Static pre-rendered shell flushed immediately in the first chunk + one dynamic `200 ms` `<Suspense>` hole streamed in the same HTTP response. |
| **`/messages`** | Baseline SSR + Disk I/O | Dynamic SSR page reading a local JSON store via `fs.promises.readFile("data/messages.json")` on every request (no in-memory framework cache) + Server Function/Action form mutation. |
| **`/rigorous/hs`** | **1. Pure HS** | Multi-level segmented layouts (`L1`, `L2`, `reset_layout`, `no_layout`) + cached page (`revalidate = 3600`), testing independent layout vs. page caching and surgical revalidation. |
| **`/rigorous/cache-slot`** | **2. Pure Cache-Slot** | Uncached dynamic host layout & page (`revalidate = 0`) embedding **10 isolated `<DinouCacheSlot>` / `"use cache"` boundaries** (static, `1s` TTL, tagged, tag-only, and stampede slots). |
| **`/rigorous/ppr`** | **3. Pure Rigorous PPR** | Instant static PPR shell + parallel `@sidebar` slot + static/dynamic/nested `<Suspense>` holes (`80 ms` delay). |
| **`/rigorous/ppr-cache-slot`** | **4. Pairwise #1 (`PPR + Slot`)** | Instant static PPR shell + `<DinouCacheSlot>` / `"use cache"` inside both the static shell and streamed `<Suspense>` holes (`80 ms`). |
| **`/rigorous/hs-cache-slot`** | **5. Pairwise #2 (`HS + Slot`)** | Cached HS layout & page (`revalidate = 3600`, Non-PPR) embedding cached slots, `1s` TTL slots, and one uncached dynamic slot (`revalidate = 0`). |
| **`/rigorous/hs-ppr`** | **6. Pairwise #3 (`HS + PPR`)** | PPR layout (`L1`) with `@sidebar` hole + PPR child pages (`80 ms` holes) with independent layout/page surgical revalidation. |
| **`/rigorous/triple`** | **7. Triple Synergy (`HS + Slot + PPR`)** | Full 3D combination: multi-level HS layouts (`L1 → L2`) + `<DinouCacheSlot>` / `"use cache"` boundaries in both static shells and streamed PPR `<Suspense>` holes (`80 ms`). |

### 7.3 Limitations & Boundary Conditions

- **Colocated Client & Server (`loopback`)**: `autocannon` and the application servers ran on the same 4-vCPU dedicated droplet over loopback (`127.0.0.1`). With `~1.0 vCPU` used by the single-threaded Node.js server and `~0.7 vCPU` by `autocannon`, `~2.0` dedicated vCPUs remain free for OS loopback, `libuv`, and V8 GC; interference is minimal and identical across frameworks, though non-zero (see [`report-infra.md`](./report-infra.md)).
- **Synthetic Delays**: The `200 ms` (`await sleep(200)`) delays on `/dashboard` and `/ppr` and `80 ms` (`await sleep(80)`) delays on `/rigorous/*` simulate database and external API latencies without external network jitter.
- **Single-Process Node.js**: Results reflect single-process Node.js execution (`node start.js` / `next start`). Multi-core deployments (`node:cluster`, PM2, or multiple container replicas behind Nginx/Envoy) scale horizontally with different absolute numbers.
- **Next.js 16 Architecture (`cacheComponents: true`)**: Next.js 16 replaces `experimental.ppr` with `cacheComponents: true` (`"use cache"`, `cacheLife`, `cacheTag`, `updateTag`, `connection()`). Both implementations follow each framework's idiomatic conventions.

### 7.4 How to Reproduce

```bash
# 1. Automated provisioning on a 4 Dedicated vCPU / 8 GB RAM Ubuntu 24.04 droplet:
git clone https://github.com/roggc/dinou-benchmark
cd dinou-benchmark
sudo bash infra/droplet-setup.sh

# 2. Run the 10-pass 3D verification suite and the full hardware benchmark pipeline:
ulimit -n 65535
node scripts/verify.mjs --only=dinou-9,next --runs=10
node scripts/bench.mjs --skip=verify

# 3. Or regenerate REPORT.md and SVG charts directly from the archived Run 2 JSON data:
node scripts/report.mjs --dir=results_run2
```
