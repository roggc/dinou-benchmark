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

## 7. Supplementary Project Metrics (Full `pnpm bench` Pipeline)

| Metric | Dinou 9.0.0 | Next.js 16.4.2 | Comparison |
| :--- | ---: | ---: | :--- |
| **Production Build Duration** | 4.6 s | 10.0–11.3 s | **2.2–2.5× faster build** |
| **Build Output Directory Size** | 4.4 MB | 37.5 MB | **8.5× smaller disk footprint** |
| **Client JS Bundle (Brotli)** | 76.9 KiB | 149.0 KiB | **~48% smaller client bundle** |
| **Dev Server Cold-Start (Median)** | 1.37 s | 3.51 s | **2.6× faster dev start** |
| **Browser HMR Edit-to-DOM (Median)** | 206 ms | 331 ms | **1.6× faster HMR** |
| **Idle Memory (RSS)** | ~273 MB | ~232 MB | Next.js uses 41 MB less at idle |
| **Peak Memory Under Load (RSS)** | ~391 MB (+118 MB) | ~474 MB (+242 MB) | Dinou expands by half as much |

> *Note on HMR*: Measured **end-to-end**: from file save on disk until the change is visible in the browser, rather than just bundler rebuild time.  
> *Note on Memory*: Sampled during the standard 50-connection pipeline run.

---

## 8. Limitations & Boundary Conditions

- **Colocated Client & Server**: The load generator and application servers ran on the same host. With 4 dedicated vCPUs, interference is minimal but non-zero.
- **Sample Size**: One official publication pass (comprising 3 independent runs per route). Results replicate earlier exploratory runs within ±5%.
- **Synthetic Delays**: The 200 ms delays on dynamic routes simulate database latency and third-party API response times.
- **Single-Process Node.js**: Results reflect single-process Node.js execution. Multi-core deployments (`node:cluster` or container clusters behind Nginx/Envoy) will exhibit different absolute numbers.
- **Next.js 16 Architecture**: Next.js 16 replaces `experimental.ppr` with `cacheComponents` (`cacheLife`, `connection()`). Both implementations aim to follow each framework's idiomatic conventions.

---

## 9. How to Reproduce

```bash
git clone https://github.com/roggc/dinou-benchmark
cd dinou-benchmark/dinou-benchmark
pnpm install --frozen-lockfile
pnpm shared

# 1. Ensure file descriptor limits
ulimit -n 65535

# 2. Build production artifacts
pnpm bench:build

# 3. Log exact environment parameters
{ node -v; pnpm -v; uname -r; nproc; free -h; } > results/env.txt

# 4. Execute official high-concurrency load suite
LOAD_CONNECTIONS=200 LOAD_DURATION=30 LOAD_WARMUP=5 LOAD_RUNS=3 pnpm bench:load

# 5. Generate Markdown report and vector charts
pnpm bench:report
```

All raw structured metrics are emitted to `results/load.json` and summarized in `results/REPORT.md`.
