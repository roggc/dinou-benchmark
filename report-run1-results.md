# Dinou v9.0.3 vs. Next.js v16.4.3 — Full 12-Route & 3D Caching Cube Benchmark Report (Run 1)

**Date:** November 2, 2026  
**Benchmark Repository:** `dinou-benchmark` (`master` branch)  
**Frameworks Evaluated:** **Dinou v9.0.3** (`dinou-9`), **Dinou v9.0.3 Unvendorized** (`dinou-9-u`, `dinou -u`), and **Next.js v16.4.3** (`next`), all running **React 19.3.1**  
**Environment:** DigitalOcean CPU-Optimized Dedicated Droplet — 4 Dedicated Intel Xeon vCPUs / 8 GB RAM / Regular Intel SSD / Ubuntu 24.04 LTS  
**Total Pipeline Execution Time:** `6,073 seconds` (`1 hour 41 minutes 13 seconds`) · **`autocannon` Socket Timeout:** `timeout = 30s` (equal to the `30s` round window)  
**Companion Reports:** [`report-run1-run2-comparison.md`](./report-run1-run2-comparison.md) · [`report-run2-results.md`](./report-run2-results.md) · [`report-3d-architecture.md`](./report-3d-architecture.md) · [`report-verify.md`](./report-verify.md) · [`report-bench-structure.md`](./report-bench-structure.md) · [`report-infra.md`](./report-infra.md) · [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md) · [`report-timeouts-diagnosis-for-dumbs.md`](./report-timeouts-diagnosis-for-dumbs.md) · [`deep-dive-investigation.md`](./deep-dive-investigation.md) · **Raw Archive:** [`results_run1/REPORT.md`](./results_run1/REPORT.md)

---

## 1. Executive Summary

This report presents the complete empirical results of the expanded **12-route `dinou-benchmark` suite**—evaluating both the **5 baseline rendering modes** (`SSG`, `ISR`, `Dynamic SSR + Suspense`, `PPR`, and `SSR + Disk I/O`) and all **7 non-empty vertices of the 3D Caching & Streaming Cube** (`2³ - 1 = 7` combinations of **Horizontal Segmentation `HS`**, **Vertical Segmentation `Cache-Slot`**, and **Partial Prerendering `PPR`**).

Every statistical phase in this run was standardized to **`n = 5` independent passes** (`BUILD_RUNS=5`, `DEV_RUNS=5`, `HMR_RUNS=5`, `LOAD_RUNS=5`, and `5` idle RSS samples), with HTTP load testing executed at **`200` concurrent connections**, **`30 seconds` per pass** (`150 seconds` of sustained load per route), **`autocannon` client socket `timeout = 30s`**, and a **`5-second` full-concurrency warmup** prior to each route.

### 1.1 Global Scorecard across All 9 Benchmark Dimensions

| Benchmark Dimension | Dinou 9.0.3 (`dinou-9`) | Dinou (-u) 9.0.3 (`dinou-9-u`) | Next.js 16.4.3 (`next`) | Dinou Vendorized (`dinou-9`) Lead vs. Next.js 16.4.3 |
| :--- | ---: | ---: | ---: | :--- |
| **1. Functional & 3D Cube Verification** (`36 checks × 10 runs`) | **`36 / 36 ✅` (`100.0%`)** | *Identical runtime* | `30 / 36` (`5 ❌`, `1 ⚠️` · `85.6%`) | **Dinou `+14.4%` compliance (`0` failures vs. `52/360` failed execs)** |
| **2. Production Build Time** (`Median of 5 runs`) | **`6.69 s`** | **`6.54 s`** | `14.88 s` | **Dinou `2.22×` faster (`-8.19 s` per build)** |
| **3. Build Output Size on Disk** (`.dinou` vs. `.next`) | **`7.5 MB`** | **`7.5 MB`** | `59.7 MB` | **Dinou `7.96×` smaller on disk (`-52.2 MB`)** |
| **4. Client JS Bundle Weight** (`Brotli -11` / `Gzip -9` / `Raw`) | **`81.8 KiB`** (`94.2` / `283.3 KiB`) | **`81.8 KiB`** (`94.2` / `283.3 KiB`) | `158.3 KiB` (`182.4` / `585.7 KiB`) | **Dinou `1.94×` smaller client JS (`-76.5 KiB` Brotli, `-48.3%`)** |
| **5. Dev Server Cold Start** (`Median of 5 runs`) | **`2.18 s`** | **`2.27 s`** | `3.55 s` | **Dinou `1.63×` faster cold start (`-1.37 s`)** |
| **6. Browser HMR Edit-to-DOM** (`Median of 5 runs`) | **`271 ms`** | **`271 ms`** | `314 ms` | **Dinou `1.16×` faster HMR (`-43 ms`)** |
| **7. Idle Server Memory** (`Median of 5 samples`) | `275.2 MB` | `275.3 MB` | **`245.9 MB`** | **Next.js `29.3 MB` lower at idle** |
| **8. Peak Memory Under 200-Conn Load** (`Peak RSS` & `Δ Expansion`) | **`488.3 MB`** (`+213.1 MB`) | **`476.7 MB`** (`+201.4 MB`) | `1,060.5 MB` (`+814.6 MB`) | **Dinou `2.17×` lower peak RAM (`-572.2 MB`) & `3.8×` less memory expansion** |
| **9. Post-Load Settled Memory** (`RSS after load`) | **`488.4 MB`** | **`476.3 MB`** | `1,060.5 MB` | **Dinou `2.17×` lower settled RAM (`-572.1 MB`)** |

---

### 1.2 Key Highlights of the 12-Route Load Benchmark (`200` Connections, `30s × 5` Runs)

1. **`/rigorous/hs-cache-slot` (Vertex 5: HS + Cache-Slot Synergy) — Dinou Is `6.67×` Faster in Throughput with `60.8×` Lower `p99` Latency:**
   - **Dinou 9.0.3:** **`684.7 req/s`** · `p50: 208 ms` · **`p99: 325 ms`** · `1 timeout (0%)`
   - **Next.js 16.4.3:** **`102.7 req/s`** · `p50: 1,039 ms` · **`p99: 19,753 ms` (~20 seconds)** · **`160 timeouts (1.04%)`**
   - When a route with a cached Horizontal Segmentation layout and page (`revalidate: 3600`) embeds a single uncached dynamic slot (`revalidate: 0`), Dinou preserves its outer HS cache and re-renders only the dynamic slot in `~1.46 ms` of CPU. Next.js 16.4.3 (`await connection()` inside the dynamic slot) de-optimizes the entire route into full dynamic SSR, collapsing throughput by `6.67×` and driving tail latencies to nearly 20 seconds.
2. **Baseline Dynamic & Streaming Routes (`/dashboard`, `/ppr`, `/messages`) — Dinou Leads by `2.20×` to `2.68×` in Throughput and `4.3×` to `15.0×` in `p99` Latency:**
   - On `/ppr` (`200 ms` hole), Dinou delivers **`504.0 req/s`** (`p99: 478 ms`) vs. Next.js's **`188.2 req/s`** (`p99: 7,192 ms`) — **`2.68×` higher throughput** and **`15.0×` lower tail latency**.
   - On `/dashboard` (`3 × 200 ms` holes), Dinou delivers **`392.7 req/s`** (`p99: 725 ms`) vs. Next.js's **`178.9 req/s`** (`p99: 10,001 ms`) — **`2.20×` higher throughput** and **`13.8×` lower tail latency**.
   - On `/messages` (async `fs.promises.readFile` disk I/O), Dinou delivers **`411.0 req/s`** (`p99: 1,935 ms`) vs. Next.js's **`154.0 req/s`** (`p99: 8,355 ms`) — **`2.67×` higher throughput** and **`4.3×` lower tail latency**.
3. **All 4 Rigorous 3D Cube PPR Vertices (`/rigorous/ppr`, `/rigorous/ppr-cache-slot`, `/rigorous/hs-ppr`, `/rigorous/triple`) — Dinou Leads by `1.50×` to `2.21×` with `0` Timeouts:**
   - On `/rigorous/triple` (Vertex 7: Triple Synergy combining `HS + Cache-Slot + PPR`), Dinou delivers **`206.8 req/s`** (`p50: 732 ms`, `p99: 11,799 ms`, **`0` timeouts**) vs. Next.js's **`93.7 req/s`** (`p50: 1,448 ms`, `p99: 22,034 ms`, **`19` timeouts**) — **`2.21×` higher throughput** and **`2.0×` lower median/tail latency**.
4. **Memory Under 200 Concurrent Connections — Next.js Exceeds `1.06 GB` (`+814.6 MB` Expansion) vs. Dinou's `488.3 MB` (`+213.1 MB` Expansion):**
   - Under `200` concurrent connections (`30s` burst on `/dashboard`), Next.js's process-tree RAM surges from `245.9 MB` at idle to **`1,060.5 MB`** (`+814.6 MB` expansion, with `0 MB` reclaimed post-load), while Dinou remains compact at **`488.3 MB` (`dinou-9`, `+213.1 MB` expansion) / `476.7 MB` (`dinou-9-u`, `+201.4 MB` expansion)** — **`2.17×` lower peak RAM** (`-572.2 MB`) and **`3.8×` less memory expansion**.

---

## 2. Full 12-Route HTTP Load Results (`200` Connections, `30s × 5` Runs)

### 2.1 Comparative Head-to-Head Summary Table (`Dinou 9.0.3 Vendorized (dinou-9)` vs. `Next.js 16.4.3`)

| Route | Rendering / 3D Cube Mode | Dinou 9.0.3 (`req/s` · `p50` / `p99`) | Next.js 16.4.3 (`req/s` · `p50` / `p99`) | Dinou Lead (`req/s`) | Dinou Lead (`p50` / `p99` Latency) |
| :--- | :--- | ---: | ---: | :---: | :---: |
| **`/`** | Baseline SSG (50 items) | **`1,424.3 req/s`** · p50 `129 ms` / p99 `173 ms` | `791.5 req/s` · p50 `199 ms` / p99 `402 ms` | **`1.80× faster`** | **`1.5×` lower p50 · `2.3×` lower p99** |
| **`/items/42`** | Baseline ISR (`60s`) | `1,229.2 req/s` · p50 `147 ms` / p99 `186 ms` | `1,235.9 req/s` · p50 `146 ms` / p99 `188 ms` | **Tie (`~1.00×`)** | **Tie (`147` vs `146 ms` p50)** |
| **`/dashboard`** | Baseline SSR + 3 Suspense (`200 ms`) | **`392.7 req/s`** · p50 `481 ms` / p99 **`725 ms`** | `178.9 req/s` · p50 `921 ms` / p99 **`10,001 ms`** | **`2.20× faster`** | **`1.9×` lower p50 · `13.8×` lower p99** |
| **`/ppr`** | Baseline PPR (`200 ms` hole) | **`504.0 req/s`** · p50 `384 ms` / p99 **`478 ms`** | `188.2 req/s` · p50 `951 ms` / p99 **`7,192 ms`** | **`2.68× faster`** | **`2.5×` lower p50 · `15.0×` lower p99** |
| **`/messages`** | Baseline SSR + Disk I/O (`readFile`) | **`411.0 req/s`** · p50 `458 ms` / p99 **`1,935 ms`** | `154.0 req/s` · p50 `1,073 ms` / p99 **`8,355 ms`** | **`2.67× faster`** | **`2.3×` lower p50 · `4.3×` lower p99** |
| **`/rigorous/hs`** | **1. Pure HS** (Segmented Layout + Page) | `1,126.5 req/s` · p50 `157 ms` / p99 `203 ms` | `1,150.4 req/s` · p50 `156 ms` / p99 `203 ms` | **Tie (`0.98×`, `<2%`)** | **Identical (`157` vs `156 ms` p50, `203 ms` p99)** |
| **`/rigorous/cache-slot`** | **2. Pure Cache-Slot** (Dynamic Host + 10 Slots) | **`215.5 req/s`** · p50 **`359 ms`** / p99 **`6,282 ms`** | `124.7 req/s` · p50 `973 ms` / p99 **`18,897 ms`** | **`1.73× faster`** | **`2.7×` lower p50 · `3.0×` lower p99** |
| **`/rigorous/ppr`** | **3. Pure Rigorous PPR** (Static/Dyn/Nested Holes) | **`196.4 req/s`** · p50 `937 ms` / p99 **`7,394 ms`** | `130.6 req/s` · p50 `1,172 ms` / p99 **`17,254 ms`** | **`1.50× faster`** | **`1.3×` lower p50 · `2.3×` lower p99** |
| **`/rigorous/ppr-cache-slot`** | **4. Pairwise #1:** PPR + Cache-Slot | **`187.7 req/s`** · p50 `909 ms` / p99 **`11,333 ms`** | `98.6 req/s` · p50 `1,436 ms` / p99 **`22,051 ms`** | **`1.90× faster`** | **`1.6×` lower p50 · `1.9×` lower p99** |
| **`/rigorous/hs-cache-slot`** | **5. Pairwise #2:** HS + Cache-Slot (Non-PPR) | **`684.7 req/s`** · p50 **`208 ms`** / p99 **`325 ms`** | `102.7 req/s` · p50 `1,039 ms` / p99 **`19,753 ms`** | **`6.67× faster`** | **`5.0×` lower p50 · `60.8×` lower p99** |
| **`/rigorous/hs-ppr`** | **6. Pairwise #3:** HS + PPR | **`191.5 req/s`** · p50 `975 ms` / p99 **`6,263 ms`** | `119.7 req/s` · p50 `1,209 ms` / p99 **`19,651 ms`** | **`1.60× faster`** | **`1.2×` lower p50 · `3.1×` lower p99** |
| **`/rigorous/triple`** | **7. Triple Synergy:** HS + Cache-Slot + PPR | **`206.8 req/s`** · p50 **`732 ms`** / p99 **`11,799 ms`** | `93.7 req/s` · p50 `1,448 ms` / p99 **`22,034 ms`** | **`2.21× faster`** | **`2.0×` lower p50 · `1.9×` lower p99** |

---

### 2.2 Detailed Per-Framework Route Tables

#### A. Dinou 9.0.3 (`apps/dinou-9` — Default Vendorized Build)

| Route | Mode / Vertex | Unloaded TTFB (Median) | Throughput (Median `req/s`) | `p50` Latency | `p99` Latency | Timeouts (`5 × 30s` Runs) | Error Rate (`%`) |
| :--- | :--- | ---: | ---: | ---: | ---: | :---: | :---: |
| `/` | SSG | `1.48 ms` | **`1,424.3 req/s`** | `129 ms` | `173 ms` | `0` | `0%` (`100% OK`) |
| `/items/42` | ISR (`60s`) | `1.40 ms` | **`1,229.2 req/s`** | `147 ms` | `186 ms` | `0` | `0%` (`100% OK`) |
| `/dashboard` | SSR + 3 Suspense | `2.93 ms` | **`392.7 req/s`** | `481 ms` | `725 ms` | `0` | `0%` (`100% OK`) |
| `/ppr` | PPR (`200 ms`) | `2.41 ms` | **`504.0 req/s`** | `384 ms` | `478 ms` | `0` | `0%` (`100% OK`) |
| `/messages` | SSR + Disk I/O | `2.53 ms` | **`411.0 req/s`** | `458 ms` | `1,935 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs` | 1. Pure HS | `1.46 ms` | **`1,126.5 req/s`** | `157 ms` | `203 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/cache-slot` | 2. Pure Cache-Slot | `4.58 ms` | **`215.5 req/s`** | `359 ms` | `6,282 ms` | `338` *(67.6/run)* | `1.05%` |
| `/rigorous/ppr` | 3. Pure Rigorous PPR | `2.47 ms` | **`196.4 req/s`** | `937 ms` | `7,394 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/ppr-cache-slot` | 4. PPR + Cache-Slot | `2.70 ms` | **`187.7 req/s`** | `909 ms` | `11,333 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs-cache-slot` | 5. HS + Cache-Slot | `2.08 ms` | **`684.7 req/s`** | `208 ms` | `325 ms` | `1` *(0.2/run)* | `0%` |
| `/rigorous/hs-ppr` | 6. HS + PPR | `2.46 ms` | **`191.5 req/s`** | `975 ms` | `6,263 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/triple` | 7. Triple Synergy | `4.07 ms` | **`206.8 req/s`** | `732 ms` | `11,799 ms` | `0` | `0%` (`100% OK`) |

#### B. Dinou (-u) 9.0.3 (`apps/dinou-9-u` — Unvendorized Build `dinou -u`)

| Route | Mode / Vertex | Unloaded TTFB (Median) | Throughput (Median `req/s`) | `p50` Latency | `p99` Latency | Timeouts (`5 × 30s` Runs) | Error Rate (`%`) |
| :--- | :--- | ---: | ---: | ---: | ---: | :---: | :---: |
| `/` | SSG | `1.15 ms` | **`1,385.5 req/s`** | `131 ms` | `172 ms` | `0` | `0%` (`100% OK`) |
| `/items/42` | ISR (`60s`) | `1.39 ms` | **`1,250.9 req/s`** | `147 ms` | `188 ms` | `0` | `0%` (`100% OK`) |
| `/dashboard` | SSR + 3 Suspense | `3.18 ms` | **`396.6 req/s`** | `480 ms` | `705 ms` | `0` | `0%` (`100% OK`) |
| `/ppr` | PPR (`200 ms`) | `2.38 ms` | **`509.6 req/s`** | `376 ms` | `478 ms` | `0` | `0%` (`100% OK`) |
| `/messages` | SSR + Disk I/O | `2.68 ms` | **`409.1 req/s`** | `462 ms` | `1,886 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs` | 1. Pure HS | `1.18 ms` | **`1,118.6 req/s`** | `158 ms` | `205 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/cache-slot` | 2. Pure Cache-Slot | `4.54 ms` | **`210.7 req/s`** | `361 ms` | `6,808 ms` | `300` *(60.0/run)* | `0.94%` |
| `/rigorous/ppr` | 3. Pure Rigorous PPR | `2.40 ms` | **`194.2 req/s`** | `933 ms` | `7,556 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/ppr-cache-slot` | 4. PPR + Cache-Slot | `2.74 ms` | **`185.0 req/s`** | `923 ms` | `11,212 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs-cache-slot` | 5. HS + Cache-Slot | `1.82 ms` | **`656.4 req/s`** | `216 ms` | `371 ms` | `30` *(6.0/run)* | `0.03%` |
| `/rigorous/hs-ppr` | 6. HS + PPR | `2.25 ms` | **`181.7 req/s`** | `1,027 ms` | `6,655 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/triple` | 7. Triple Synergy | `4.37 ms` | **`196.7 req/s`** | `766 ms` | `12,713 ms` | `0` | `0%` (`100% OK`) |

#### C. Next.js 16.4.3 (`apps/next`)

| Route | Mode / Vertex | Unloaded TTFB (Median) | Throughput (Median `req/s`) | `p50` Latency | `p99` Latency | Timeouts (`5 × 30s` Runs) | Error Rate (`%`) |
| :--- | :--- | ---: | ---: | ---: | ---: | :---: | :---: |
| `/` | SSG | `6.21 ms` | `791.5 req/s` | `199 ms` | `402 ms` | `0` | `0%` (`100% OK`) |
| `/items/42` | ISR (`60s`) | `2.16 ms` | `1,235.9 req/s` | `146 ms` | `188 ms` | `0` | `0%` (`100% OK`) |
| `/dashboard` | SSR + 3 Suspense | `7.70 ms` | `178.9 req/s` | `921 ms` | `10,001 ms` | `0` | `0%` (`100% OK`) |
| `/ppr` | PPR (`200 ms`) | `3.13 ms` | `188.2 req/s` | `951 ms` | `7,192 ms` | `0` | `0%` (`100% OK`) |
| `/messages` | SSR + Disk I/O | `7.83 ms` | `154.0 req/s` | `1,073 ms` | `8,355 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/hs` | 1. Pure HS | `2.34 ms` | `1,150.4 req/s` | `156 ms` | `203 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/cache-slot` | 2. Pure Cache-Slot | `3.73 ms` | `124.7 req/s` | `973 ms` | `18,897 ms` | `99` *(19.8/run)* | `0.52%` |
| `/rigorous/ppr` | 3. Pure Rigorous PPR | `3.36 ms` | `130.6 req/s` | `1,172 ms` | `17,254 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/ppr-cache-slot` | 4. PPR + Cache-Slot | `3.16 ms` | `98.6 req/s` | `1,436 ms` | `22,051 ms` | `1` *(0.2/run)* | `0.01%` |
| `/rigorous/hs-cache-slot` | 5. HS + Cache-Slot | `3.46 ms` | `102.7 req/s` | `1,039 ms` | `19,753 ms` | `160` *(32.0/run)* | `1.04%` |
| `/rigorous/hs-ppr` | 6. HS + PPR | `3.52 ms` | `119.7 req/s` | `1,209 ms` | `19,651 ms` | `0` | `0%` (`100% OK`) |
| `/rigorous/triple` | 7. Triple Synergy | `3.29 ms` | `93.7 req/s` | `1,448 ms` | `22,034 ms` | `19` *(3.8/run)* | `0.13%` |

> **Note on `autocannon` Socket Timeouts (`timeout = 30s` in Run 1 vs. `timeout = 60s` in Run 2):** In this first production run (`Run 1`), `scripts/load.mjs` computed `timeout: Math.max(30, setup.load.durationSeconds)` = **`30 seconds`**, inadvertently setting `timeout === duration` (`30s === 30s`). Because `autocannon` (`lib/run.js`) initializes each client socket's `30,000 ms` `timeoutTicker` a few milliseconds before the benchmark's `30,000 ms` `stopTimer` and `40 ms` teardown loop (`client.destroy()`), any initial-burst (`t = 0`) socket still queued behind active keep-alive sockets when the 30-second round ends fires a teardown-window timeout at `+30.03s–+30.05s`. Restoring the `timeout > duration` safety margin (`timeout = 60s`) in **Run 2** (documented in [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md), [`report-timeouts-diagnosis-for-dumbs.md`](./report-timeouts-diagnosis-for-dumbs.md), and [`report-run2-results.md`](./report-run2-results.md)) eliminated **100% of timeouts across all 12 routes and all 3 frameworks (`339 → 0` in `dinou-9`, `330 → 0` in `dinou-9-u`, and `279 → 0` in `next`)** while reproducing consistent throughput and latency figures (within `~1%–5%` run-to-run variance).

---

## 3. Deep Architectural Analysis of the 12-Route Load Results

### 3.1 Why Dinou Beats Next.js by `6.67×` in Throughput and `60.8×` in `p99` Latency on `/rigorous/hs-cache-slot`
The single largest performance divergence in the entire 12-route benchmark occurs on **Vertex 5: `/rigorous/hs-cache-slot` (`Pairwise #2: HS + Cache-Slot Synergy, Non-PPR`)**:
- **Dinou 9.0.3:** `684.7 req/s` · `p50: 208 ms` · **`p99: 325 ms`** · `1 timeout`
- **Next.js 16.4.3:** `102.7 req/s` · `p50: 1,039 ms` · **`p99: 19,753 ms`** · `160 timeouts`

**Architectural Root Cause:**
- On `/rigorous/hs-cache-slot`, the outer layout (`HsCacheSlotLayout`) and host page (`HsCacheSlotPageA`) are configured as cached **Horizontal Segmentation (`HS`)** segments (`revalidate = 3600`), while embedding several cached `<DinouCacheSlot>` components alongside one intentionally uncached dynamic slot (`hscs-page-a-dyn-slot` with `revalidate = 0`) and two `1s` TTL slots (`revalidate = 1`).
- In **Dinou v9.0.3**, **Horizontal Segmentation (`HS`) and Vertical Segmentation (`Cache-Slot`) are orthogonal**. Even without PPR enabled on this route, Dinou keeps the host layout and page cached in its HS store and only executes and splices the dynamic `<DinouCacheSlot revalidate={0}>` subtree on each request (`~1.46 ms` of CPU work per request → **`684.7 req/s`** and a sub-350ms `p99` of **`325 ms`**).
- In **Next.js v16.4.3**, when a Non-PPR route contains an uncached component that opts into request-time execution via `await connection()`, Next.js cannot serve the surrounding page shell from a route cache unless the dynamic component is wrapped in a streaming `<Suspense>` boundary (PPR). Consequently, Next.js falls back to full dynamic route rendering on every request, dropping from `1,150.4 req/s` (on `/rigorous/hs`) down to **`102.7 req/s`** (`6.67×` slower than Dinou), with `p99` tail latency exploding to **`19.75 seconds`** (`60.8×` worse than Dinou) and **`160` request timeouts**.

---

### 3.2 Pure Cache-Slot & Streaming 3D Cube Vertices (`/rigorous/cache-slot`, `/rigorous/ppr`, `/rigorous/ppr-cache-slot`, `/rigorous/hs-ppr`, `/rigorous/triple`)
Across all remaining dynamic and hybrid vertices of the 3D Caching Cube, Dinou maintains a commanding lead in both throughput and latency:

1. **Vertex 2 — `/rigorous/cache-slot` (`Pure Cache-Slot on Dynamic Host`):**
   - **Dinou 9.0.3 (`215.5 req/s`, `p50: 359 ms`, `p99: 6,282 ms`)** outperforms **Next.js 16.4.3 (`124.7 req/s`, `p50: 973 ms`, `p99: 18,897 ms`)** by **`1.73×` in throughput**, **`2.71×` in `p50` latency**, and **`3.01×` in `p99` latency**.
   - Even when the host page itself has `revalidate = 0` and splices 10 `<DinouCacheSlot>` subtrees per request, Dinou's in-memory slot splicing takes just `~4.64 ms` of effective server time per request under 200-connection load (`215.5 req/s`, `4.58 ms` unloaded TTFB) vs. `~8.02 ms` per request under load (`124.7 req/s`) in Next.js's `"use cache"` pipeline.
2. **Vertex 3 — `/rigorous/ppr` (`Pure Rigorous PPR`):**
   - **Dinou 9.0.3 (`196.4 req/s`, `p50: 937 ms`, `p99: 7,394 ms`)** outperforms **Next.js 16.4.3 (`130.6 req/s`, `p50: 1,172 ms`, `p99: 17,254 ms`)** by **`1.50×` in throughput** and **`2.33×` lower `p99` latency**.
3. **Vertex 4 — `/rigorous/ppr-cache-slot` (`PPR + Cache-Slot Synergy`):**
   - **Dinou 9.0.3 (`187.7 req/s`, `p50: 909 ms`, `p99: 11,333 ms`, `0` timeouts)** outperforms **Next.js 16.4.3 (`98.6 req/s`, `p50: 1,436 ms`, `p99: 22,051 ms`, `1` timeout)** by **`1.90×` in throughput** and **`1.95×` lower `p99` latency**.
4. **Vertex 6 — `/rigorous/hs-ppr` (`HS + PPR Synergy`):**
   - **Dinou 9.0.3 (`191.5 req/s`, `p50: 975 ms`, `p99: 6,263 ms`)** outperforms **Next.js 16.4.3 (`119.7 req/s`, `p50: 1,209 ms`, `p99: 19,651 ms`)** by **`1.60×` in throughput** and **`3.14×` lower `p99` latency**.
5. **Vertex 7 — `/rigorous/triple` (`Triple Synergy: HS + Cache-Slot + PPR`):**
   - When all three caching and streaming dimensions operate simultaneously on the same route, **Dinou 9.0.3 (`206.8 req/s`, `p50: 732 ms`, `p99: 11,799 ms`, `0` timeouts)** outperforms **Next.js 16.4.3 (`93.7 req/s`, `p50: 1,448 ms`, `p99: 22,034 ms`, `19` timeouts)** by **`2.21×` in throughput**, **`1.98×` lower `p50`**, and **`1.87×` lower `p99`**.
   - Notice that in Next.js, combining PPR with Cache-Slots (`/rigorous/ppr-cache-slot` and `/rigorous/triple`) degrades throughput below `100 req/s` (`98.6` and `93.7 req/s`) and pushes `p99` past **22 seconds**, whereas in Dinou `/rigorous/triple` (`206.8 req/s`, `p50: 732 ms`) is actually **faster** than `/rigorous/ppr` (`196.4 req/s`, `p50: 937 ms`) because `<DinouCacheSlot>` caches the expensive work inside the streamed PPR holes!

---

### 3.3 Static & Fully Cached Routes (`/`, `/items/42`, `/rigorous/hs`) as an Architectural Control Group
Examining the three fully cached routes provides an illuminating control baseline:
- On **`/items/42` (ISR `60s`)** and **`/rigorous/hs` (Pure HS, `revalidate: 3600`)**, both frameworks serve pre-cached responses from memory without executing React components per request. Here, throughput is virtually tied (`1,229–1,251` vs. `1,236 req/s` on `/items/42`, and `1,127` vs. `1,150 req/s` on `/rigorous/hs`), with identical latencies (`p50: 146–157 ms`, `p99: 186–203 ms`).
- On **`/` (SSG · 50 items list)**, where Next.js transfers a `~2.6×` larger HTML + inline RSC Flight payload per request (`~73 KB/req` vs. Dinou's `~28 KB/req`, as measured in [`deep-dive-investigation.md`](./deep-dive-investigation.md)), Dinou achieves **`1,424.3 req/s` (`p99: 173 ms`, `TTFB: 1.48 ms`)** vs. Next.js's **`791.5 req/s` (`p99: 402 ms`, `TTFB: 6.21 ms`)** — a **`1.80×` throughput lead** and **`4.2×` faster unloaded TTFB**.
- **Conclusion from the Control Group:** When zero React rendering occurs at request time and payloads are small (`/items/42`, `/rigorous/hs`), Node.js's underlying HTTP server performs identically in both frameworks. The moment per-request RSC rendering, Suspense streaming, Cache-Slot splicing, or larger Flight payloads enter the picture (the other 10 routes), Dinou's leaner runtime architecture delivers **`1.50×` to `6.67×` higher throughput** and **`2×` to `60×` lower tail latency**.

---

### 3.4 Vendorized (`dinou-9`) vs. Unvendorized (`dinou-9-u`) Production Parity
Comparing `Dinou 9.0.3` (`dinou-9`, default vendorized server build) against `Dinou (-u) 9.0.3` (`dinou-9-u`, unvendorized `dinou -u` build) across all 12 routes confirms:
- Once V8 loads the module graph into RAM and completes the 5-second JIT warmup, **production HTTP throughput and latency are statistically indistinguishable** between `dinou-9` and `dinou-9-u` (within `~1%–5%` across all 12 routes, e.g., `392.7` vs. `396.6 req/s` on `/dashboard`, `504.0` vs. `509.6 req/s` on `/ppr`, `1,126.5` vs. `1,118.6 req/s` on `/rigorous/hs`).
- Meanwhile, `dinou-9-u` compiles **`0.15s` faster** in `pnpm run build` (`6.54s` vs. `6.69s` median) and consumes **`11.6 MB` less peak RAM** under 200-connection load (`476.7 MB` vs. `488.3 MB`).

---

## 4. Process-Tree Memory Footprint Under 200 Concurrent Connections (`pnpm bench:memory`)

`scripts/memory.mjs` measures the complete process-tree Resident Set Size (`VmRSS` on Linux) across three lifecycle stages: **Idle** (median of 5 samples taken 3s after server boot), **Peak Under Load** (sampled every 400ms during a 30-second, 200-connection `autocannon` burst against `/dashboard`), and **Post-Load Settled**.

| Framework | Idle RSS (Median of 5 Samples) | Peak RSS Under Load (`200 Conn, 30s`) | Memory Expansion Under Load (`Δ`) | Post-Load Settled RSS | Peak Memory Comparison vs. Next.js |
| :--- | ---: | ---: | ---: | ---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `275.2 MB` | **`488.3 MB`** | **`+213.1 MB`** (`+77.4%`) | **`488.4 MB`** | **`2.17×` lower peak RSS (`-572.2 MB`)** |
| **Dinou (-u) 9.0.3 (`dinou-9-u`)** | `275.3 MB` | **`476.7 MB`** | **`+201.4 MB`** (`+73.2%`) | **`476.3 MB`** | **`2.22×` lower peak RSS (`-583.8 MB`)** |
| **Next.js 16.4.3 (`next`)** | **`245.9 MB`** | `1,060.5 MB` | `+814.6 MB` (`+331.3%`) | `1,060.5 MB` | Baseline (`> 1.06 GB` RAM) |

### Production Memory Scaling & Container Headroom Analysis (`200` Connections)
- **Dinou v9.0.3 (`dinou-9`):** Under 200 concurrent connections on `/dashboard`, process-tree RSS grows by only **`+213.1 MB`** (`275.2 MB` → **`488.3 MB`** peak, **`476.7 MB`** in `dinou-9-u`), comfortably fitting inside a `512 MB` or `1 GB` container.
- **Next.js v16.4.3 (`next`):** Under the exact same 200-connection workload, Next.js's peak RSS expands by **`+814.6 MB`** (`245.9 MB` → **`1,060.5 MB`**, **`3.8×` more memory expansion** than `dinou-9` and `0 MB` reclaimed post-load), crossing **1 GB of RAM for a single Node.js process**—which on `512 MB` or `1 GB` container instances (AWS Fargate, Fly.io, Render, Railway, Kubernetes pods) would trigger an immediate Linux **OOM-Kill (`SIGKILL`)**.

---

## 5. Build, Disk Output, Client Bundle & Developer Experience (`n = 5` Runs)

### 5.1 Production Build Duration & Output Disk Footprint (`pnpm bench:build`, `BUILD_RUNS=5`)

| Framework | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | **Median Build Time** | **Output Directory Size** | Build Speed & Disk Lead |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `6.57 s` | `6.73 s` | `6.65 s` | `6.69 s` | `6.73 s` | **`6.69 s`** | **`7.5 MB`** (`.dinou`) | **`2.22×` faster · `7.96×` smaller disk** |
| **Dinou (-u) 9.0.3 (`dinou-9-u`)** | `6.61 s` | `6.59 s` | `6.47 s` | `6.54 s` | `6.53 s` | **`6.54 s`** | **`7.5 MB`** (`.dinou`) | **`2.28×` faster · `7.96×` smaller disk** |
| **Next.js 16.4.3 (`next`)** | `14.84 s` | `14.88 s` | `15.26 s` | `14.89 s` | `14.77 s` | `14.88 s` | `59.7 MB` (`.next`) | Baseline |

*Note on Output Directory Footprint:* Across all 12 production routes and 7 multi-route 3D Caching Cube suites, Dinou's compiled `.dinou` build directory occupies **`7.5 MB`** (`7,473,400 bytes` in `dinou-9`, `7,482,184 bytes` in `dinou-9-u`), whereas Next.js's `.next` directory occupies **`59.7 MB`** (`59,667,313 bytes`) — **`7.96×` larger on disk**.

---

### 5.2 Client-Side JavaScript Bundle Delivery (`pnpm bench:bundle`)

| Framework | Client `.js` Files | Raw Size | Gzip Size (`-9`) | **Brotli Size (`-11`)** | Client Payload Comparison |
| :--- | :---: | ---: | ---: | ---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `23 files` | **`283.3 KiB`** | **`94.2 KiB`** | **`81.8 KiB`** | **`1.94×` smaller (`-76.5 KiB` Brotli)** |
| **Dinou (-u) 9.0.3 (`dinou-9-u`)** | `23 files` | **`283.3 KiB`** | **`94.2 KiB`** | **`81.8 KiB`** | **`1.94×` smaller (`-76.5 KiB` Brotli)** |
| **Next.js 16.4.3 (`next`)** | `15 files` | `585.7 KiB` | `182.4 KiB` | `158.3 KiB` | Baseline |

---

### 5.3 Dev Server Cold Start (`pnpm bench:dev`, `DEV_RUNS=5`)

| Framework | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | **Median Cold Start** | Cold Start Comparison |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `2.21 s` | `2.18 s` | `2.14 s` | `2.21 s` | `2.16 s` | **`2.18 s`** | **`1.63×` faster (`-1.37 s`)** |
| **Dinou (-u) 9.0.3 (`dinou-9-u`)** | `2.34 s` | `2.27 s` | `2.26 s` | `2.26 s` | `2.32 s` | **`2.27 s`** | **`1.56×` faster (`-1.28 s`)** |
| **Next.js 16.4.3 (`next`)** | `3.56 s` | `3.55 s` | `3.55 s` | `3.54 s` | `3.56 s` | `3.55 s` | Baseline |

---

### 5.4 Real-Browser HMR Latency (`pnpm bench:hmr`, `HMR_RUNS=5`)

| Framework | Run 1 | Run 2 | Run 3 | Run 4 | Run 5 | **Median HMR (`edit → DOM`)** | HMR Comparison |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | :--- |
| **Dinou 9.0.3 (`dinou-9`)** | `266 ms` | `271 ms` | `258 ms` | `330 ms` | `272 ms` | **`271 ms`** | **`1.16×` faster (`-43 ms`)** |
| **Dinou (-u) 9.0.3 (`dinou-9-u`)** | `263 ms` | `317 ms` | `318 ms` | `268 ms` | `271 ms` | **`271 ms`** | **`1.16×` faster (`-43 ms`)** |
| **Next.js 16.4.3 (`next`)** | `299 ms` | `345 ms` | `309 ms` | `314 ms` | `316 ms` | `314 ms` | Baseline |

*(Notice how using `n = 5` median sampling cleanly filtered the single `330 ms` GC/OS spike in Run 4 of `dinou-9`, yielding the true central `271 ms` median across both `dinou-9` and `dinou-9-u`).*

