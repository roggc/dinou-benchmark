# Dinou vs Next.js — Official Benchmark Results

> A head-to-head comparison of **Dinou 8.1.2**, **Dinou 9.0.0**, and **Next.js 16.4.2** (all running React 19.3.1) across an identical application with equivalent pages: SSG, ISR, SSR with Suspense, PPR, and SSR with disk I/O.

---

## 1. Executive Summary

> **Official Run Date:** October 26, 2026 · **Environment:** 4 Dedicated vCPUs / 8 GB RAM (DigitalOcean CPU-Optimized)

Under 200 concurrent connections, 30s per execution, 3 runs per route:

| Route | Type | Dinou 9.0.0 | Next.js 16.4.2 | Dinou Lead (req/s) | Dinou Lead (p99 Latency) |
| :--- | :--- | ---: | ---: | :---: | :---: |
| `/ppr` | PPR | **638 req/s** · p99 388 ms | 202 req/s · p99 6,030 ms | **3.2× faster** | **15× lower latency** |
| `/messages` | SSR (Disk I/O) | **482 req/s** · p99 870 ms | 197 req/s · p99 5,776 ms | **2.4× faster** | **6.6× lower latency** |
| `/dashboard` | SSR + Suspense | **460 req/s** · p99 574 ms | 195 req/s · p99 7,947 ms | **2.4× faster** | **14× lower latency** |
| `/` | SSG | **1,722 req/s** · p99 138 ms | 806 req/s · p99 380 ms | **2.1× faster** | **2.8× lower latency** |
| `/items/42` | ISR (Cached) | **1,732 req/s** · p99 145 ms | 1,311 req/s · p99 177 ms | **1.3× faster** | **1.2× lower latency** |

- Across all 5 evaluated routes, **Dinou outperforms Next.js in both throughput and latency**.
- On dynamic and PPR routes, Dinou delivers **2.4× to 3.2× higher throughput** while maintaining a p99 latency that is **up to 15× lower**.
- On **ISR, both frameworks serve directly from cache**, resulting in a narrow gap (1.3× in favor of Dinou).
- **Dinou 8.1.2 and 9.0.0 exhibit equivalent performance** (variance remains within ±5%), showing no measurable performance regression in this benchmark.

---

## 2. Testbed & Environment

| Parameter | Specification |
| :--- | :--- |
| **Instance / Hardware** | DigitalOcean CPU-Optimized, 4 Dedicated vCPUs (`Intel Xeon Platinum 8168 @ 2.70GHz`), 8 GB RAM |
| **Operating System** | Ubuntu 24.04 LTS, kernel `6.8.0-142-generic` |
| **Node.js Runtime** | `v22.23.4` |
| **Package Manager** | `pnpm 12.15.0` |
| **Load Client** | `autocannon 8.0.0` (same host, loopback) |
| **OS Limits (`ulimit -n` / `somaxconn`)** | `65535` / `65535` |
| **Framework Versions** | Dinou 8.1.2 · Dinou 9.0.0 · Next.js 16.4.2 · React 19.3.1 |

---

## 3. Methodology

- **Production Builds Only**: All three applications are measured in production mode (`build` + `start`), never in development.
- **200 Connections, 30s Duration, 3 Runs per Route**: All load metrics represent sustained high-concurrency traffic.
- **5s Warm-up at Full 200 Connections**: Performed prior to recording each route to warm up the V8 JIT and caches.
- **Percentile Calculation**: Each published percentile represents the **median of that respective percentile across the 3 independent runs**. Because Autocannon does not record an exact p95, reported "p95" entries represent the **p97.5** upper bound.
- **Throughput (req/s)**: Median across the 3 runs (minimum and maximum values are preserved in `results/load.json`).
- **Sequential TTFB (Unloaded)**: 30 sequential requests sampled **without concurrent load** between warm-up and load testing. This establishes baseline server processing time and must not be conflated with latency under load.
- **Keep-Alive Configuration**: `keepAliveTimeout` is configured to 65s across all apps. Dinou additionally sets `headersTimeout` to 66s. Next.js does not expose this setting and defaults to Node's 60s value.
- **Autocannon Timeout at 30s or Higher**: Delayed requests from initial connection queues are recorded as **latency** rather than premature client-side abort errors.
- **Zero Active Instrumentation**: No diagnostic hooks, probes, or logging listeners were active during the official run.

### Evaluated Routes

| Route | Implementation Details |
| :--- | :--- |
| `/` | SSG · 50 items list loaded from local JSON, statically pre-rendered at build time |
| `/items/42` | ISR · Detail view, `revalidate: 60` |
| `/dashboard` | Dynamic SSR · Shell + three parallel Suspense slots with 200 ms artificial delay (`await sleep(200)`) |
| `/ppr` | Partial Prerendering · Static shell + one dynamic 200 ms slot streamed in the same HTTP response |
| `/messages` | Dynamic SSR · reads a local JSON store via `fs.promises.readFile` on every request (no in-memory cache) |

---

## 4. Full Benchmark Results

### Dinou 8.1.2

| Route | TTFB (Unloaded) | Throughput (req/s) | p50 Latency | p99 Latency | Errors |
| :--- | ---: | ---: | ---: | ---: | :---: |
| `/` | 1.28 ms | 1,752.3 req/s | 106 ms | 144 ms | 0 |
| `/items/42` | 0.92 ms | 1,697.4 req/s | 106 ms | 137 ms | 0 |
| `/dashboard` | 2.70 ms | 470.0 req/s | 407 ms | 559 ms | 0 |
| `/ppr` | 1.97 ms | 647.5 req/s | 302 ms | 382 ms | 0 |
| `/messages` | 2.27 ms | 481.8 req/s | 401 ms | 928 ms | 0 |

### Dinou 9.0.0

| Route | TTFB (Unloaded) | Throughput (req/s) | p50 Latency | p99 Latency | Errors |
| :--- | ---: | ---: | ---: | ---: | :---: |
| `/` | 1.17 ms | 1,722.4 req/s | 109 ms | 138 ms | 0 |
| `/items/42` | 0.90 ms | 1,731.8 req/s | 106 ms | 145 ms | 0 |
| `/dashboard` | 2.61 ms | 459.5 req/s | 414 ms | 574 ms | 0 |
| `/ppr` | 2.04 ms | 638.2 req/s | 303 ms | 388 ms | 0 |
| `/messages` | 2.11 ms | 481.6 req/s | 400 ms | 870 ms | 0 |

### Next.js 16.4.2

| Route | TTFB (Unloaded) | Throughput (req/s) | p50 Latency | p99 Latency | Errors |
| :--- | ---: | ---: | ---: | ---: | :---: |
| `/` | 2.64 ms | 805.5 req/s | 188 ms | 380 ms | 0 |
| `/items/42` | 1.93 ms | 1,310.7 req/s | 139 ms | 177 ms | 0 |
| `/dashboard` | 7.22 ms | 194.7 req/s | 909 ms | 7,947 ms | 0 |
| `/ppr` | 3.01 ms | 202.3 req/s | 900 ms | 6,030 ms | 0 |
| `/messages` | 6.12 ms | 196.7 req/s | 937 ms | 5,776 ms | 0 |

---

## 5. Reproducibility & Variance Analysis

This official run matches an earlier independent run (200 connections, 30s × 1, without full-concurrency warm-up): **all throughput figures remain within ±5% variance**.

| Route | Dinou 9 (Previous → Official) | Dinou 9 Mean | Next 16 (Previous → Official) | Next 16 Mean | Winner (Overall Mean Lead) |
| :--- | :--- | ---: | :--- | ---: | :---: |
| `/` | 1,658 → 1,722 req/s (+4%) | **1,690.0 req/s** | 846 → 806 req/s (−5%) | 826.0 req/s | **Dinou (2.0× faster)** |
| `/items/42` | 1,699 → 1,732 req/s (+2%) | **1,715.5 req/s** | 1,362 → 1,311 req/s (−4%) | 1,336.5 req/s | **Dinou (1.3× faster)** |
| `/dashboard` | 436 → 460 req/s (+5%) | **448.0 req/s** | 187 → 195 req/s (+4%) | 191.0 req/s | **Dinou (2.3× faster)** |
| `/ppr` | 624 → 638 req/s (+2%) | **631.0 req/s** | 200 → 202 req/s (+1%) | 201.0 req/s | **Dinou (3.1× faster)** |
| `/messages` | 491 → 482 req/s (−2%) | **486.5 req/s** | 195 → 197 req/s (+1%) | 196.0 req/s | **Dinou (2.5× faster)** |

Furthermore, an independent load generator (Grafana k6, 200 Virtual Users, 30s duration, route `/`) confirmed Dinou's advantage with a consistent performance ratio: **Dinou delivered 1,441.6 req/s vs Next.js's 771.3 req/s (1.87× faster)**, with a p95 latency of **141 ms (Dinou) vs 261 ms (Next.js)**, and 0 failed checks in both frameworks.

---

## 6. How to Interpret These Results

### "0 Errors" Reflects the 30s Timeout Configuration
In preliminary runs with Autocannon's default 10s per-request timeout, client timeouts occurred primarily on Next.js. With a 30s client timeout, delayed requests are recorded as **tail latency** rather than connection failures. Error metrics from this run should therefore not be compared directly against runs using lower timeout thresholds.

### The Initial Connection Burst Phenomenon
Each test execution opens 200 TCP connections simultaneously on localhost. While Node's single-threaded event loop is saturated servicing active keep-alive streams, queued connections dwell in the Linux kernel listen backlog until accepted across successive loop turns. **This occurs in both frameworks and is an OS/event-loop queueing dynamic, not a framework bug.** It primarily impacts maximum latency, which is why p50 and p99 percentiles are reported instead of maximums.

- In Dinou, this queueing affected ~0.04% of requests on `/`, leaving p99 unaffected (138 ms).
- In Next.js, this affected ~0.7% of requests on `/`. These requests fall close to the 99th percentile, raising Next's p99 on `/` to 380 ms despite a p50 of 188 ms.

The exhaustive diagnostic investigation into this behavior is documented in [`deep-dive-investigation.md`](./deep-dive-investigation.md).

### True Event Loop Saturation on Dynamic Routes in Next.js
On `/dashboard`, `/ppr`, and `/messages`, Next.js's median latency (p50) reaches **~900 ms**, with tail queues reaching **6–8 seconds**. In contrast, Dinou maintains a **~300–400 ms p50** and a **sub-second p99 (< 1s)**. Under identical high concurrency, Dinou stays close to the baseline architectural latency of each route (200 ms per dynamic slot), whereas Next.js accumulates compounding queue dwell times.

### ISR: Smallest Gap (Dinou Leads by 1.3×)
Because both frameworks serve cached ISR responses without executing page components on every request, framework runtime overhead represents a smaller portion of total request handling. **Dinou maintains the lead across all metrics** (1,732 vs 1,311 req/s, a 1.3× throughput advantage; 145 ms vs 177 ms p99 latency), but the performance gap is the narrowest among all evaluated routes.

---

## 7. Supplementary Pipeline Metrics (`pnpm bench`)

Beyond throughput and latency under high-concurrency load, the automated benchmark suite executes an evaluation pipeline measuring functional compliance, build duration, bundle delivery, developer server metrics, and process-tree memory consumption on the same 4 vCPU / 8 GB cloud instance.

### 7.1 Overview Table

| Metric | Dinou 8.1.2 | Dinou 9.0.0 | Next.js 16.4.2 | Comparison vs Next.js Baseline |
| :--- | ---: | ---: | ---: | :--- |
| **Functional Verification Gate** | 13/13 (100% OK) | 13/13 (100% OK) | 13/13 (100% OK) | **Tie (13/13 passed)** |
| **Production Build Duration (Median)** | 4.95 s (4.5 / 5.4 s) | 4.60 s (4.6 / 4.6 s) | 10.65 s (10.0 / 11.3 s) | **Dinou 9 (2.3× faster, 4.60 s vs 10.65 s)** |
| **Output Directory Size on Disk** | 4.4 MB | 4.4 MB | 37.5 MB | **Dinou (8.5× smaller, 4.4 MB vs 37.5 MB)** |
| **Client JS Bundle (Brotli)** | 76.8 KiB (17 files) | 76.9 KiB (17 files) | 149.0 KiB (11 files) | **Dinou (1.94× smaller payload, -72.1 KiB)** |
| **Dev Server Cold-Start (Median)** | 1.49 s | 1.37 s | 3.51 s | **Dinou 9 (2.6× faster, 1.37 s vs 3.51 s)** |
| **Real Browser HMR Edit-to-DOM (Median)** | 211 ms | 206 ms | 331 ms | **Dinou 9 (1.6× faster, 206 ms vs 331 ms)** |
| **Idle Memory (RSS)** | 271.9 MB | 272.7 MB | 231.9 MB | **Next.js (40.8 MB lower idle RSS)** |
| **Memory Expansion Under Load ($\Delta$)** | +117.4 MB | +118.2 MB | +241.6 MB | **Dinou 9 (+118.2 MB vs +241.6 MB)** |
| **Peak Memory Under Load (RSS)** | 389.3 MB | 390.9 MB | 473.5 MB | **Dinou 9 (82.6 MB lower peak RSS)** |
| **Post-Load Settled Memory (RSS)** | 388.1 MB | 390.1 MB | 471.5 MB | **Dinou 9 (81.4 MB lower settled RSS)** |

---

### 7.2 Functional Verification Gate (`pnpm bench:verify`)

Prior to recording performance metrics, the automated verification script executes 13 assertions per framework using an HTTP client and Playwright Chromium session. All three implementations achieved **100% compliance (13/13 OK)**, validating equivalence across SSG, ISR, SSR, streaming PPR, and server mutation lifecycles.

#### Dinou 8.1.2 (`apps/dinou-8`) — 13/13 Checks OK

| Check / Assertion | Status | Measured Timing & Detail |
| :--- | :---: | :--- |
| `ssg: / responds 200` | ✅ Pass | 6.0 ms |
| `ssg: / 50 items listing` | ✅ Pass | 50 items rendered |
| `ssg: stable HTML across requests` | ✅ Pass | 3 identical requests |
| `isr: /items/1 responds 200` | ✅ Pass | 5.3 ms |
| `isr: cached and stable HTML` | ✅ Pass | 2 identical requests |
| `isr: prerendered route /items/42` | ✅ Pass | Correct content verified |
| `404: nonexistent routes` | ✅ Pass | `/this-route-does-not-exist=404`, `/items/999=404` |
| `dashboard: responds 200` | ✅ Pass | 210.1 ms |
| `dashboard: is dynamic (two requests differ)` | ✅ Pass | Different timestamps verified |
| `dashboard: streams 3 holes after fallback` | ✅ Pass | 3 fallbacks · 3 holes · 208.4 ms |
| `ppr: static shell in first chunk` | ✅ Pass | First chunk in 6.01 ms |
| `ppr: hole arrives later (streaming)` | ✅ Pass | Shell 4.12 ms · Total stream 205.75 ms |
| `mutation: Server Function visible in browser` | ✅ Pass | Persisted and rendered (Playwright end-to-end) |

#### Dinou 9.0.0 (`apps/dinou-9`) — 13/13 Checks OK

| Check / Assertion | Status | Measured Timing & Detail |
| :--- | :---: | :--- |
| `ssg: / responds 200` | ✅ Pass | 4.3 ms |
| `ssg: / 50 items listing` | ✅ Pass | 50 items rendered |
| `ssg: stable HTML across requests` | ✅ Pass | 3 identical requests |
| `isr: /items/1 responds 200` | ✅ Pass | 3.2 ms |
| `isr: cached and stable HTML` | ✅ Pass | 2 identical requests |
| `isr: prerendered route /items/42` | ✅ Pass | Correct content verified |
| `404: nonexistent routes` | ✅ Pass | `/this-route-does-not-exist=404`, `/items/999=404` |
| `dashboard: responds 200` | ✅ Pass | 210.2 ms |
| `dashboard: is dynamic (two requests differ)` | ✅ Pass | Different timestamps verified |
| `dashboard: streams 3 holes after fallback` | ✅ Pass | 3 fallbacks · 3 holes · 208.6 ms |
| `ppr: static shell in first chunk` | ✅ Pass | First chunk in 5.64 ms |
| `ppr: hole arrives later (streaming)` | ✅ Pass | Shell 4.13 ms · Total stream 205.61 ms |
| `mutation: Server Function visible in browser` | ✅ Pass | Persisted and rendered (Playwright end-to-end) |

#### Next.js 16.4.2 (`apps/next`) — 13/13 Checks OK

| Check / Assertion | Status | Measured Timing & Detail |
| :--- | :---: | :--- |
| `ssg: / responds 200` | ✅ Pass | 9.5 ms |
| `ssg: / 50 items listing` | ✅ Pass | 50 items rendered |
| `ssg: stable HTML across requests` | ✅ Pass | 3 identical requests |
| `isr: /items/1 responds 200` | ✅ Pass | 11.7 ms |
| `isr: cached and stable HTML` | ✅ Pass | 2 identical requests |
| `isr: prerendered route /items/42` | ✅ Pass | Correct content verified |
| `404: nonexistent routes` | ✅ Pass | `/this-route-does-not-exist=404`, `/items/999=404` |
| `dashboard: responds 200` | ✅ Pass | 238.8 ms |
| `dashboard: is dynamic (two requests differ)` | ✅ Pass | Different timestamps verified |
| `dashboard: streams 3 holes after fallback` | ✅ Pass | 3 fallbacks · 3 holes · 211.6 ms |
| `ppr: static shell in first chunk` | ✅ Pass | First chunk in 11.07 ms |
| `ppr: hole arrives later (streaming)` | ✅ Pass | Shell 5.80 ms · Total stream 214.43 ms |
| `mutation: Server Function visible in browser` | ✅ Pass | Persisted and rendered (Playwright end-to-end) |

#### Timed Verification Assertions Comparison

| Assertion | Dinou 8.1.2 | Dinou 9.0.0 | Next.js 16.4.2 | Comparison vs Next.js Baseline |
| :--- | ---: | ---: | ---: | :--- |
| **SSG `/` Response** | 6.0 ms | **4.3 ms** | 9.5 ms | **Dinou 9 (2.2× faster)** |
| **ISR `/items/1` Response** | 5.3 ms | **3.2 ms** | 11.7 ms | **Dinou 9 (3.6× faster)** |
| **SSR `/dashboard` Response** | **210.1 ms** | 210.2 ms | 238.8 ms | **Dinou 8/9 (~28.6 ms faster)** |
| **PPR Shell First Chunk (TTFB)** | 6.01 ms | **5.64 ms** | 11.07 ms | **Dinou 9 (2.0× faster)** |
| **PPR Full Streaming Completion** | 205.75 ms | **205.61 ms** | 214.43 ms | **Dinou 9 (8.8 ms faster)** |

---

### 7.3 Production Build & Disk Footprint (`pnpm bench:build`)

Measured across repeated production builds (`pnpm run build`), clearing all build outputs and compiler caches before each run:

| Framework | Run 1 | Run 2 | Median Duration | Total Output Size | Build Duration Comparison | Disk Footprint Comparison |
| :--- | ---: | ---: | ---: | ---: | :---: | :---: |
| **Dinou 8.1.2** | 5.4 s | 4.5 s | **4.95 s** | **4.4 MB** (`.dinou`) | **Dinou (2.2× faster)** | **Dinou (8.5× smaller)** |
| **Dinou 9.0.0** | 4.6 s | 4.6 s | **4.60 s** | **4.4 MB** (`.dinou`) | **Dinou (2.3× faster)** | **Dinou (8.5× smaller)** |
| **Next.js 16.4.2** | 11.3 s | 10.0 s | 10.65 s | 37.5 MB (`.next`) | Baseline | Baseline |

- **Build Duration** — Dinou 9.0.0 median build duration is 4.60 s, compared to 10.65 s in Next.js 16.4.2 (2.3× faster).
- **Disk Footprint** — Dinou build output directory occupies 4.4 MB (`.dinou`), compared to 37.5 MB in Next.js 16.4.2 (`.next`) (8.5× smaller).

---

### 7.4 Client-Side JavaScript Bundle Delivery (`pnpm bench:bundle`)

Traverses production client bundles and compresses each file using gzip (-9) and Brotli (-11):

| Framework | Client JS Files | Raw Size | Gzip Size (-9) | Brotli Size (-11) | Brotli Transfer Comparison |
| :--- | :---: | ---: | ---: | ---: | :---: |
| **Dinou 8.1.2** | 17 files | 268.6 KiB | 88.4 KiB | **76.8 KiB** | **Dinou (-72.2 KiB)** |
| **Dinou 9.0.0** | 17 files | 268.6 KiB | 88.4 KiB | **76.9 KiB** | **Dinou (-72.1 KiB)** |
| **Next.js 16.4.2** | 11 files | 558.8 KiB | 171.9 KiB | 149.0 KiB | Baseline |

- **Client Bundle Size** — Dinou 9.0.0 delivers 76.9 KiB of Brotli-compressed client JavaScript across 17 files, compared to 149.0 KiB across 11 files in Next.js 16.4.2 (a 1.94× smaller payload, or 48.4% less transferred data).

---

### 7.5 Developer Experience: Cold Start & Real-Browser HMR (`pnpm bench:dev`, `pnpm bench:hmr`)

Measured in development mode on localhost:

| Framework | Dev Cold Start (3 Runs) | Cold Start Median | Cold Start Comparison | Chromium HMR (2 Runs) | HMR Median | HMR Comparison |
| :--- | :--- | ---: | :---: | :--- | ---: | :---: |
| **Dinou 8.1.2** | 1.53 s / 1.43 s / 1.49 s | **1.49 s** | **Dinou (2.4× faster)** | 216 ms / 206 ms | **211 ms** | **Dinou (1.6× faster)** |
| **Dinou 9.0.0** | 1.41 s / 1.35 s / 1.37 s | **1.37 s** | **Dinou (2.6× faster)** | 205 ms / 206 ms | **206 ms** | **Dinou (1.6× faster)** |
| **Next.js 16.4.2** | 3.68 s / 3.51 s / 3.50 s | 3.51 s | Baseline | 310 ms / 351 ms | 331 ms | Baseline |

- **Cold Start** — Dinou 9.0.0 median cold start time to first HTTP 200 response is 1.37 s, compared to 3.51 s in Next.js 16.4.2 (2.6× faster).
- **Real-Browser HMR** — Dinou 9.0.0 median HMR DOM update latency is 206 ms, compared to 331 ms in Next.js 16.4.2 (1.6× faster). Measured end-to-end via Playwright headless Chromium: navigates to the page, modifies a text node in `page.tsx` on disk, and measures elapsed time until the DOM reflects the update without a full page reload.

---

### 7.6 Memory Footprint & Expansion Dynamics (`pnpm bench:memory`)

Tracks resident set size (RSS) across the complete process tree before, during, and after sustained HTTP load:

| Framework | Idle RSS (5 Samples) | Peak RSS Under Load | Expansion ($\Delta$) | Post-Load Settled RSS |
| :--- | ---: | ---: | ---: | ---: |
| **Dinou 8.1.2** | 271.9 MB | **389.3 MB** | **+117.4 MB** | **388.1 MB** |
| **Dinou 9.0.0** | 272.7 MB | **390.9 MB** | **+118.2 MB** | **390.1 MB** |
| **Next.js 16.4.2** | **231.9 MB** | 473.5 MB | +241.6 MB | 471.5 MB |

- **Idle Footprint** — Next.js 16.4.2 records 40.8 MB lower RSS at idle prior to receiving traffic (231.9 MB vs 272.7 MB in Dinou 9.0.0).
- **Memory Expansion Under Load** — Under sustained HTTP load, Dinou 9.0.0 process-tree RSS grows by +118.2 MB, compared to +241.6 MB in Next.js 16.4.2 (a 2.04× difference in expansion).
- **Peak & Post-Load Settled Memory** — Dinou 9.0.0 reaches a peak RSS of 390.9 MB (82.6 MB lower than Next.js at 473.5 MB) and settles at 390.1 MB post-load (81.4 MB lower than Next.js at 471.5 MB).

---

## 8. Limitations & Boundary Conditions

- **Colocated Client & Server**: The load generator and application servers ran on the same host. With 4 dedicated vCPUs, interference is minimal but non-zero.
- **Sample Size**: One official publication pass (comprising 3 independent runs per route). Results replicate earlier exploratory runs within ±5%.
- **Synthetic Delays**: The 200 ms delays on dynamic routes simulate database latency and third-party API response times.
- **Single-Process Node.js**: Results reflect single-process Node.js execution. Multi-core deployments (`node:cluster` or container clusters behind Nginx/Envoy) will exhibit different absolute numbers.
- **Next.js 16 Architecture**: Next.js 16 replaces `experimental.ppr` with `cacheComponents` (`cacheLife`, `connection()`). Both implementations aim to follow each framework's idiomatic conventions.

---

## 9. How to Reproduce

### 9.1 Machine Provisioning (Dedicated Cloud Droplet)

For rigorous, clean reproduction without CPU noisy-neighbor interference, deploy a dedicated cloud instance (e.g. DigitalOcean CPU-Optimized, 4 Dedicated vCPUs / 8 GB RAM on Ubuntu 24.04 LTS) and run the automated provisioning script:

```bash
git clone https://github.com/roggc/dinou-benchmark
cd dinou-benchmark/dinou-benchmark

# Provision environment: installs Node 22 LTS, pnpm, Playwright Chromium, 
# configures 4 GB swap, tunes somaxconn and file descriptor limits:
sudo bash infra/droplet-setup.sh
```

### 9.2 Running the Full Benchmark Suite (`pnpm bench`)

To reproduce the complete benchmark pipeline (`build` → `verify` → `bundle` → `dev-start` → `hmr` → `load` → `memory` → `report`):

```bash
# 1. Log exact hardware and runtime parameters
mkdir -p results
{ node -v; pnpm -v; uname -r; nproc; free -h; } > results/env.txt

# 2. Run the complete automated pipeline with official high-concurrency load settings:
ulimit -n 65535
LOAD_CONNECTIONS=200 LOAD_DURATION=30 LOAD_WARMUP=5 LOAD_RUNS=3 pnpm bench
```

> **Note**: You can also run individual phases independently if preferred:
> - **Functional Verification Gate**: `pnpm bench:verify`
> - **Production Build & Disk Footprint**: `pnpm bench:build`
> - **Client JS Bundle Delivery**: `pnpm bench:bundle`
> - **Developer Experience (Cold Start & HMR)**: `pnpm bench:dev && pnpm bench:hmr`
> - **High-Concurrency Load Testing**: `LOAD_CONNECTIONS=200 LOAD_DURATION=30 LOAD_WARMUP=5 LOAD_RUNS=3 pnpm bench:load`
> - **Process-Tree Memory Consumption**: `pnpm bench:memory`
> - **Markdown Report & Charts**: `pnpm bench:report`

All structured outputs are persisted to JSON under `results/` (`load.json`, `build.json`, `verify.json`, `bundle.json`, `dev-start.json`, `hmr.json`, `memory.json`) and compiled into `results/REPORT.md`.
