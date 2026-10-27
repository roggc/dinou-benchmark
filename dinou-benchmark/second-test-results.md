# Second Benchmark Run (Full 4-Way Suite)

> **Follow-up run on October 27, 2026, validating Dinou 9.0.2 (vendorized and unvendorized `-u`) against Dinou 8.1.2 and Next.js 16.4.2 under 200 concurrent connections across all phases.**

---

## 1. Testbed & Execution Configuration

* **Host**: DigitalOcean CPU-Optimized Droplet
* **Compute**: 4 Dedicated vCPUs (`Intel(R) Xeon(R) Platinum 8168 CPU @ 2.70GHz`)
* **RAM / OS**: 8 GB RAM · Ubuntu 24.04 LTS · Node.js `v22.23.4` · `pnpm 12.15.0`
* **Evaluated Frameworks**:
  1. `dinou-8`: Dinou 8.1.2 (Port 3101)
  2. `dinou-9`: Dinou 9.0.2 (Vendorized mode, Port 3121)
  3. `dinou-9-u`: Dinou (-u) 9.0.2 (Unvendorized mode resolving `node_modules`, Port 3131)
  4. `next`: Next.js 16.4.2 (Port 3111)
* **Execution Command**:
  ```bash
  LOAD_CONNECTIONS=200 LOAD_DURATION=30 LOAD_WARMUP=5 LOAD_RUNS=3 pnpm bench
  ```

---

## 2. Verbatim Droplet Terminal Output

```text
root@dinou-benchmark-runner:~/dinou-benchmark/dinou-benchmark# LOAD_CONNECTIONS=200 LOAD_DURATION=30 LOAD_WARMUP=5 LOAD_RUNS=3 pnpm bench
$ node scripts/bench.mjs

▶ build
Dinou 8.1.2: build 4.8 / 4.7 s · output 4.4 MB
Dinou 9.0.2: build 4.9 / 4.9 s · output 4.4 MB
Dinou (-u) 9.0.2: build 4.7 / 4.9 s · output 4.4 MB
Next.js 16.4.2: build 11 / 11.1 s · output 37.5 MB

▶ verify

=== Dinou 8.1.2 (apps/dinou-8) ===
build ok in 4.7 s

13/13 checks OK
  ✓ ssg: / responds 200 — 7.7 ms
  ✓ ssg: / 50 items listing — 50 items
  ✓ ssg: stable HTML across requests — 3 identical requests
  ✓ isr: /items/1 responds 200 — 4.6 ms
  ✓ isr: cached and stable HTML — 2 identical requests
  ✓ isr: prerendered route /items/42 — correct content
  ✓ 404: nonexistent routes — /this-route-does-not-exist=404 /items/999=404
  ✓ dashboard: responds 200 — 210.6 ms
  ✓ dashboard: is dynamic (two requests differ) — different timestamps
  ✓ dashboard: streams 3 holes after fallback — 3 fallbacks · 3 holes · 207.8 ms
  ✓ ppr: static shell in first chunk — first chunk 5.41 ms
  ✓ ppr: hole arrives later (streaming) — shell 4.73 ms · total 205.89 ms
  ✓ mutation: Server Function visible in browser — persisted and rendered

=== Dinou 9.0.2 (apps/dinou-9) ===
build ok in 4.8 s

13/13 checks OK
  ✓ ssg: / responds 200 — 4.5 ms
  ✓ ssg: / 50 items listing — 50 items
  ✓ ssg: stable HTML across requests — 3 identical requests
  ✓ isr: /items/1 responds 200 — 3.4 ms
  ✓ isr: cached and stable HTML — 2 identical requests
  ✓ isr: prerendered route /items/42 — correct content
  ✓ 404: nonexistent routes — /this-route-does-not-exist=404 /items/999=404
  ✓ dashboard: responds 200 — 208.1 ms
  ✓ dashboard: is dynamic (two requests differ) — different timestamps
  ✓ dashboard: streams 3 holes after fallback — 3 fallbacks · 3 holes · 209.3 ms
  ✓ ppr: static shell in first chunk — first chunk 6.93 ms
  ✓ ppr: hole arrives later (streaming) — shell 7.28 ms · total 210.04 ms
  ✓ mutation: Server Function visible in browser — persisted and rendered

=== Dinou (-u) 9.0.2 (apps/dinou-9-u) ===
build ok in 4.7 s

13/13 checks OK
  ✓ ssg: / responds 200 — 5.1 ms
  ✓ ssg: / 50 items listing — 50 items
  ✓ ssg: stable HTML across requests — 3 identical requests
  ✓ isr: /items/1 responds 200 — 3.6 ms
  ✓ isr: cached and stable HTML — 2 identical requests
  ✓ isr: prerendered route /items/42 — correct content
  ✓ 404: nonexistent routes — /this-route-does-not-exist=404 /items/999=404
  ✓ dashboard: responds 200 — 210.8 ms
  ✓ dashboard: is dynamic (two requests differ) — different timestamps
  ✓ dashboard: streams 3 holes after fallback — 3 fallbacks · 3 holes · 207.7 ms
  ✓ ppr: static shell in first chunk — first chunk 5.22 ms
  ✓ ppr: hole arrives later (streaming) — shell 4.46 ms · total 206.7 ms
  ✓ mutation: Server Function visible in browser — persisted and rendered

=== Next.js 16.4.2 (apps/next) ===
build ok in 5.7 s

13/13 checks OK
  ✓ ssg: / responds 200 — 9.9 ms
  ✓ ssg: / 50 items listing — 50 items
  ✓ ssg: stable HTML across requests — 3 identical requests
  ✓ isr: /items/1 responds 200 — 12.2 ms
  ✓ isr: cached and stable HTML — 2 identical requests
  ✓ isr: prerendered route /items/42 — correct content
  ✓ 404: nonexistent routes — /this-route-does-not-exist=404 /items/999=404
  ✓ dashboard: responds 200 — 237.5 ms
  ✓ dashboard: is dynamic (two requests differ) — different timestamps
  ✓ dashboard: streams 3 holes after fallback — 3 fallbacks · 3 holes · 215.3 ms
  ✓ ppr: static shell in first chunk — first chunk 10.61 ms
  ✓ ppr: hole arrives later (streaming) — shell 6.43 ms · total 215.17 ms
  ✓ mutation: Server Function visible in browser — persisted and rendered

VERIFY OK — results in results/verify.json

▶ bundle
Dinou 8.1.2: 17 client JS files · 268.6 KiB raw · 88.4 KiB gzip · 76.9 KiB brotli
Dinou 9.0.2: 17 client JS files · 268.6 KiB raw · 88.4 KiB gzip · 76.8 KiB brotli
Dinou (-u) 9.0.2: 17 client JS files · 268.6 KiB raw · 88.4 KiB gzip · 76.8 KiB brotli
Next.js 16.4.2: 11 client JS files · 558.8 KiB raw · 171.9 KiB gzip · 149 KiB brotli

▶ dev-start
Dinou 8.1.2: dev cold start 1.59 / 1.51 / 1.56 s (median 1.56 s)
Dinou 9.0.2: dev cold start 1.5 / 1.47 / 1.51 s (median 1.5 s)
Dinou (-u) 9.0.2: dev cold start 1.61 / 1.58 / 1.63 s (median 1.61 s)
Next.js 16.4.2: dev cold start 3.83 / 3.86 / 3.77 s (median 3.83 s)

▶ hmr
Dinou 8.1.2: HMR 209 / 212 ms (median 211 ms)
Dinou 9.0.2: HMR 206 / 209 ms (median 208 ms)
Dinou (-u) 9.0.2: HMR 210 / 206 ms (median 208 ms)
Next.js 16.4.2: HMR 355 / 338 ms (median 347 ms)

▶ load

=== load: Dinou 8.1.2 ===
  /            ttfb     1.4 ms ·    1649 req/s · p50 111 / p99 140 ms · 0 errors (100% OK)
  /items/42    ttfb    0.93 ms ·  1574.1 req/s · p50 116 / p99 146 ms · 0 errors (100% OK)
  /dashboard   ttfb    2.93 ms ·   422.1 req/s · p50 451 / p99 648 ms · 0 errors (100% OK)
  /ppr         ttfb    2.24 ms ·   593.4 req/s · p50 329 / p99 415 ms · 0 errors (100% OK)
  /messages    ttfb    2.68 ms ·   436.7 req/s · p50 431 / p99 1630 ms · 0 errors (100% OK)

=== load: Dinou 9.0.2 ===
  /            ttfb    1.26 ms ·  1545.9 req/s · p50 128 / p99 149 ms · 0 errors (100% OK)
  /items/42    ttfb    0.95 ms ·    1625 req/s · p50 109 / p99 151 ms · 0 errors (100% OK)
  /dashboard   ttfb     3.1 ms ·     417 req/s · p50 452 / p99 668 ms · 0 errors (100% OK)
  /ppr         ttfb    2.16 ms ·   594.8 req/s · p50 331 / p99 406 ms · 0 errors (100% OK)
  /messages    ttfb    2.61 ms ·   447.3 req/s · p50 436 / p99 1535 ms · 0 errors (100% OK)

=== load: Dinou (-u) 9.0.2 ===
  /            ttfb    1.24 ms ·  1654.7 req/s · p50 108 / p99 139 ms · 0 errors (100% OK)
  /items/42    ttfb    1.19 ms ·    1531 req/s · p50 119 / p99 156 ms · 0 errors (100% OK)
  /dashboard   ttfb    3.13 ms ·   415.8 req/s · p50 449 / p99 653 ms · 0 errors (100% OK)
  /ppr         ttfb    2.14 ms ·   608.9 req/s · p50 316 / p99 412 ms · 0 errors (100% OK)
  /messages    ttfb    2.54 ms ·   443.2 req/s · p50 425 / p99 1404 ms · 0 errors (100% OK)

=== load: Next.js 16.4.2 ===
  /            ttfb    6.02 ms ·   832.4 req/s · p50 193 / p99 379 ms · 0 errors (100% OK)
  /items/42    ttfb     1.9 ms ·  1358.4 req/s · p50 138 / p99 174 ms · 0 errors (100% OK)
  /dashboard   ttfb    7.87 ms ·   177.7 req/s · p50 927 / p99 9484 ms · 0 errors (100% OK)
  /ppr         ttfb    3.28 ms ·   190.3 req/s · p50 955 / p99 6572 ms · 0 errors (100% OK)
  /messages    ttfb    7.72 ms ·     186 req/s · p50 974 / p99 6677 ms · 0 errors (100% OK)

▶ memory
Dinou 8.1.2: RSS idle 272.7 MB · peak 473.1 MB · post-load 473.1 MB
Dinou 9.0.2: RSS idle 272.7 MB · peak 473.6 MB · post-load 473.1 MB
Dinou (-u) 9.0.2: RSS idle 273.1 MB · peak 477.7 MB · post-load 477.2 MB
Next.js 16.4.2: RSS idle 232.5 MB · peak 1057.5 MB · post-load 1056 MB

▶ report
Wrote results/REPORT.md and results/charts.svg

Full pipeline completed in 2288 s. Report: results/REPORT.md
root@dinou-benchmark-runner:~/dinou-benchmark/dinou-benchmark#
```

---

## 3. Key Observations from this Run

1. **Memory at 200 Connections**: Under 200 concurrent connections, Next.js peak RSS reached **1,057.5 MB** (post-load 1,056 MB), whereas Dinou 9.0.2 peaked at **473.6 MB** and Dinou (-u) 9.0.2 peaked at **477.7 MB** (Dinou consumed **584 MB less** RAM under high concurrency).
2. **Dinou 9 vs Dinou (-u) 9 Parity**: Both vendorized and unvendorized modes perform in 100% parity across build duration (~4.7–4.9s), client bundle (76.8 KiB brotli), dev start (~1.5–1.6s), HMR (208 ms), throughput, and memory.
3. **Throughput / Latency Preservation**: Dinou maintains its 2.4×–3.2× throughput advantage on dynamic routes (`/dashboard`, `/ppr`, `/messages`) and keeps tail latencies (p99) significantly lower than Next.js.
