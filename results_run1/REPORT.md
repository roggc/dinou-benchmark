# Benchmark Results: Dinou v9.0.3 vs. Next.js v16.4.3

Generated: 2026-11-02T10:32:30.712Z

> **Execution Environment.** Performance, build, startup, HMR, and memory figures in this report were recorded on a dedicated DigitalOcean CPU-Optimized droplet (**4 Dedicated Intel Xeon vCPUs / 8 GB RAM**, Ubuntu 24.04 LTS, provisioned via `infra/droplet-setup.sh`) across **`n = 5` independent passes** (`200` concurrent connections, `30s` per round, `5s` warmup). Functional and 3D Caching Cube verification (`36 checks × 10 runs = 360 executions`) is documented in [`report-verify.md`](../report-verify.md).

## Functional & Rigorous 3D Caching Verification

| Framework | Version | Checks Passed | Status |
| --- | --- | --- | --- |
| Dinou 9.0.3 | `9.0.3` | 36/36 | ✅ |
| Next.js 16.4.3 | `16.4.3` | 30/36 | ⚠️ |

Failures:

- Next.js 16.4.3 → rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard: [0/10 FAIL] router.refresh() (page-only) must NOT re-execute layout (expected 100, got 270)
- Next.js 16.4.3 → rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL: [0/10 FAIL] wildcard refreshSlot('*', { fresh: true }) must NOT re-execute host layout or host page (got layout=999, page=999)
- Next.js 16.4.3 → rigorous-cache-slot-stampede: 6 concurrent cold-miss requests coalesce into 1 slot execution: [8/10 FLAKY (2 Fail of 10 execs)] expected stampede protection to execute cold 150ms slot exactly once across 6 concurrent requests, got 2
- Next.js 16.4.3 → rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh): [0/10 FAIL] LWW race failed in DOM: late slow request (401/stale-slow) overwrote fast request (402/fresh-fast); got seq=401 label=stale-slow
- Next.js 16.4.3 → rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back: [0/10 FAIL] expected Page A to be served from client pageCache with 0 page RSC fetches (host=100) + slotOverride=410, got host=100 pageRscReqs=3
- Next.js 16.4.3 → rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag: [0/10 FAIL] tag-only refreshSlot must NOT re-execute dynamic host page (expected 100, got 999)

## Production · TTFB, Throughput and Latency (Baseline + 7 Rigorous 3D Caching Suites)

| Route | Type | Framework | TTFB p50 (ms) | TTFB p95 (ms) | req/s | p50 (ms) | p99 (ms) | Errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | ssg | Dinou 9.0.3 | 1.48 | 45.16 | 1424.3 | 129.00 | 173.00 | 0 (0%) |
| `/` | ssg | Dinou 9.0.3 (-u) | 1.15 | 83.70 | 1385.5 | 131.00 | 172.00 | 0 (0%) |
| `/` | ssg | Next.js 16.4.3 | 6.21 | 17.96 | 791.5 | 199.00 | 402.00 | 0 (0%) |
| `/items/42` | isr | Dinou 9.0.3 | 1.40 | 2.01 | 1229.2 | 147.00 | 186.00 | 0 (0%) |
| `/items/42` | isr | Dinou 9.0.3 (-u) | 1.39 | 4.39 | 1250.9 | 147.00 | 188.00 | 0 (0%) |
| `/items/42` | isr | Next.js 16.4.3 | 2.16 | 2.37 | 1235.9 | 146.00 | 188.00 | 0 (0%) |
| `/dashboard` | ssr | Dinou 9.0.3 | 2.93 | 6.39 | 392.7 | 481.00 | 725.00 | 0 (0%) |
| `/dashboard` | ssr | Dinou 9.0.3 (-u) | 3.18 | 3.88 | 396.6 | 480.00 | 705.00 | 0 (0%) |
| `/dashboard` | ssr | Next.js 16.4.3 | 7.70 | 11.33 | 178.9 | 921.00 | 10001.00 | 0 (0%) |
| `/ppr` | ppr | Dinou 9.0.3 | 2.41 | 5.72 | 504.0 | 384.00 | 478.00 | 0 (0%) |
| `/ppr` | ppr | Dinou 9.0.3 (-u) | 2.38 | 3.06 | 509.6 | 376.00 | 478.00 | 0 (0%) |
| `/ppr` | ppr | Next.js 16.4.3 | 3.13 | 12.58 | 188.2 | 951.00 | 7192.00 | 0 (0%) |
| `/messages` | ssr | Dinou 9.0.3 | 2.53 | 6.39 | 411.0 | 458.00 | 1935.00 | 0 (0%) |
| `/messages` | ssr | Dinou 9.0.3 (-u) | 2.68 | 6.76 | 409.1 | 462.00 | 1886.00 | 0 (0%) |
| `/messages` | ssr | Next.js 16.4.3 | 7.83 | 12.94 | 154.0 | 1073.00 | 8355.00 | 0 (0%) |
| `/rigorous/hs` | hs | Dinou 9.0.3 | 1.46 | 2.00 | 1126.5 | 157.00 | 203.00 | 0 (0%) |
| `/rigorous/hs` | hs | Dinou 9.0.3 (-u) | 1.18 | 3.84 | 1118.6 | 158.00 | 205.00 | 0 (0%) |
| `/rigorous/hs` | hs | Next.js 16.4.3 | 2.34 | 7.07 | 1150.4 | 156.00 | 203.00 | 0 (0%) |
| `/rigorous/cache-slot` | cache-slot | Dinou 9.0.3 | 4.58 | 8.18 | 215.5 | 359.00 | 6282.00 | 338 (1.05%) · 338 to |
| `/rigorous/cache-slot` | cache-slot | Dinou 9.0.3 (-u) | 4.54 | 7.80 | 210.7 | 361.00 | 6808.00 | 300 (0.94%) · 300 to |
| `/rigorous/cache-slot` | cache-slot | Next.js 16.4.3 | 3.73 | 11.58 | 124.7 | 973.00 | 18897.00 | 99 (0.52%) · 99 to |
| `/rigorous/ppr` | ppr-rigorous | Dinou 9.0.3 | 2.47 | 2.89 | 196.4 | 937.00 | 7394.00 | 0 (0%) |
| `/rigorous/ppr` | ppr-rigorous | Dinou 9.0.3 (-u) | 2.40 | 5.08 | 194.2 | 933.00 | 7556.00 | 0 (0%) |
| `/rigorous/ppr` | ppr-rigorous | Next.js 16.4.3 | 3.36 | 10.08 | 130.6 | 1172.00 | 17254.00 | 0 (0%) |
| `/rigorous/ppr-cache-slot` | ppr+slot | Dinou 9.0.3 | 2.70 | 9.38 | 187.7 | 909.00 | 11333.00 | 0 (0%) |
| `/rigorous/ppr-cache-slot` | ppr+slot | Dinou 9.0.3 (-u) | 2.74 | 8.26 | 185.0 | 923.00 | 11212.00 | 0 (0%) |
| `/rigorous/ppr-cache-slot` | ppr+slot | Next.js 16.4.3 | 3.16 | 10.46 | 98.6 | 1436.00 | 22051.00 | 1 (0.01%) · 1 to |
| `/rigorous/hs-cache-slot` | hs+slot | Dinou 9.0.3 | 2.08 | 8.42 | 684.7 | 208.00 | 325.00 | 1 (0%) · 1 to |
| `/rigorous/hs-cache-slot` | hs+slot | Dinou 9.0.3 (-u) | 1.82 | 3.16 | 656.4 | 216.00 | 371.00 | 30 (0.03%) · 30 to |
| `/rigorous/hs-cache-slot` | hs+slot | Next.js 16.4.3 | 3.46 | 8.06 | 102.7 | 1039.00 | 19753.00 | 160 (1.04%) · 160 to |
| `/rigorous/hs-ppr` | hs+ppr | Dinou 9.0.3 | 2.46 | 3.01 | 191.5 | 975.00 | 6263.00 | 0 (0%) |
| `/rigorous/hs-ppr` | hs+ppr | Dinou 9.0.3 (-u) | 2.25 | 3.69 | 181.7 | 1027.00 | 6655.00 | 0 (0%) |
| `/rigorous/hs-ppr` | hs+ppr | Next.js 16.4.3 | 3.52 | 6.78 | 119.7 | 1209.00 | 19651.00 | 0 (0%) |
| `/rigorous/triple` | triple | Dinou 9.0.3 | 4.07 | 8.79 | 206.8 | 732.00 | 11799.00 | 0 (0%) |
| `/rigorous/triple` | triple | Dinou 9.0.3 (-u) | 4.37 | 8.95 | 196.7 | 766.00 | 12713.00 | 0 (0%) |
| `/rigorous/triple` | triple | Next.js 16.4.3 | 3.29 | 14.25 | 93.7 | 1448.00 | 22034.00 | 19 (0.13%) · 19 to |

Load test: 200 connections, 30 s per round, 5 rounds, median across rounds. autocannon does not expose exact p95; p97.5 is used as an upper bound.

## Build, Startup, HMR, Bundle and Memory

| Metric | Dinou 9.0.3 | Dinou 9.0.3 (-u) | Next.js 16.4.3 |
| --- | --- | --- | --- |
| Production build (s, median) | 6.69 | 6.54 | 14.88 |
| Output size (MB) | 7.5 | 7.5 | 59.7 |
| Dev cold start (s, median) | 2.18 | 2.27 | 3.55 |
| HMR edit → DOM (ms, median) | 271 | 271 | 314 |
| Client JS (KiB gzip) | 94.2 | 94.2 | 182.4 |
| Client JS (KiB brotli) | 81.8 | 81.8 | 158.3 |
| Idle RSS (MB, median) | 275.2 | 275.3 | 245.9 |
| Peak RSS under load (MB) | 488.3 | 476.7 | 1060.5 |

