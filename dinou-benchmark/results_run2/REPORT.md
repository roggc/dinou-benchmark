# Benchmark Results: Dinou v9.0.3 vs. Next.js v16.4.3

Generated: 2026-11-02T17:09:34.413Z

> **Execution Environment.** Performance, build, startup, HMR, and memory figures in this report were recorded on a dedicated DigitalOcean CPU-Optimized droplet (**4 Dedicated Intel Xeon vCPUs / 8 GB RAM**, Ubuntu 24.04 LTS, provisioned via `infra/droplet-setup.sh`) across **`n = 5` independent passes** (`200` concurrent connections, `30s` per round, `5s` warmup). Functional and 3D Caching Cube verification (`36 checks × 10 runs = 360 executions`) is documented in [`report-verify.md`](../report-verify.md).

## Functional & Rigorous 3D Caching Verification

| Framework | Version | Checks Passed | Status |
| --- | --- | --- | --- |
| Dinou 9.0.3 | `9.0.3` | 36/36 | ✅ |
| Next.js 16.4.3 | `16.4.3` | 31/36 | ⚠️ |

Failures:

- Next.js 16.4.3 → rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard: [0/10 FAIL] router.refresh() (page-only) must NOT re-execute layout (expected 100, got 270)
- Next.js 16.4.3 → rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL: [0/10 FAIL] wildcard refreshSlot('*', { fresh: true }) must NOT re-execute host layout or host page (got layout=999, page=999)
- Next.js 16.4.3 → rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh): [0/10 FAIL] LWW race failed in DOM: late slow request (401/stale-slow) overwrote fast request (402/fresh-fast); got seq=401 label=stale-slow
- Next.js 16.4.3 → rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back: [0/10 FAIL] expected Page A to be served from client pageCache with 0 page RSC fetches (host=100) + slotOverride=410, got host=100 pageRscReqs=3
- Next.js 16.4.3 → rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag: [0/10 FAIL] tag-only refreshSlot must NOT re-execute dynamic host page (expected 100, got 999)

## Production · TTFB, Throughput and Latency (Baseline + 7 Rigorous 3D Caching Suites)

| Route | Type | Framework | TTFB p50 (ms) | TTFB p95 (ms) | req/s | p50 (ms) | p99 (ms) | Errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | ssg | Dinou 9.0.3 | 1.45 | 42.85 | 1432.4 | 127.00 | 176.00 | 0 (0%) |
| `/` | ssg | Dinou 9.0.3 (-u) | 1.24 | 67.46 | 1397.3 | 128.00 | 165.00 | 0 (0%) |
| `/` | ssg | Next.js 16.4.3 | 5.59 | 10.76 | 835.8 | 188.00 | 392.00 | 0 (0%) |
| `/items/42` | isr | Dinou 9.0.3 | 1.18 | 6.31 | 1274.1 | 143.00 | 185.00 | 0 (0%) |
| `/items/42` | isr | Dinou 9.0.3 (-u) | 1.13 | 4.89 | 1214.8 | 144.00 | 194.00 | 0 (0%) |
| `/items/42` | isr | Next.js 16.4.3 | 2.03 | 3.25 | 1292.5 | 143.00 | 181.00 | 0 (0%) |
| `/dashboard` | ssr | Dinou 9.0.3 | 3.05 | 9.47 | 408.0 | 461.00 | 683.00 | 0 (0%) |
| `/dashboard` | ssr | Dinou 9.0.3 (-u) | 3.12 | 4.91 | 409.9 | 467.00 | 693.00 | 0 (0%) |
| `/dashboard` | ssr | Next.js 16.4.3 | 7.26 | 12.02 | 189.2 | 920.00 | 9195.00 | 0 (0%) |
| `/ppr` | ppr | Dinou 9.0.3 | 2.42 | 3.45 | 514.4 | 381.00 | 479.00 | 0 (0%) |
| `/ppr` | ppr | Dinou 9.0.3 (-u) | 2.33 | 2.58 | 534.3 | 359.00 | 461.00 | 0 (0%) |
| `/ppr` | ppr | Next.js 16.4.3 | 2.74 | 7.95 | 196.6 | 945.00 | 6255.00 | 0 (0%) |
| `/messages` | ssr | Dinou 9.0.3 | 2.48 | 5.99 | 421.7 | 445.00 | 1655.00 | 0 (0%) |
| `/messages` | ssr | Dinou 9.0.3 (-u) | 3.02 | 7.26 | 420.8 | 448.00 | 1691.00 | 0 (0%) |
| `/messages` | ssr | Next.js 16.4.3 | 6.20 | 11.42 | 170.0 | 1017.00 | 7497.00 | 0 (0%) |
| `/rigorous/hs` | hs | Dinou 9.0.3 | 1.20 | 5.24 | 1180.0 | 153.00 | 200.00 | 0 (0%) |
| `/rigorous/hs` | hs | Dinou 9.0.3 (-u) | 1.16 | 1.68 | 1145.0 | 156.00 | 199.00 | 0 (0%) |
| `/rigorous/hs` | hs | Next.js 16.4.3 | 2.23 | 14.73 | 1245.9 | 142.00 | 183.00 | 0 (0%) |
| `/rigorous/cache-slot` | cache-slot | Dinou 9.0.3 | 4.70 | 9.24 | 222.1 | 350.00 | 5973.00 | 0 (0%) |
| `/rigorous/cache-slot` | cache-slot | Dinou 9.0.3 (-u) | 4.39 | 7.52 | 215.9 | 372.00 | 6398.00 | 0 (0%) |
| `/rigorous/cache-slot` | cache-slot | Next.js 16.4.3 | 2.74 | 6.63 | 133.3 | 917.00 | 18552.00 | 0 (0%) |
| `/rigorous/ppr` | ppr-rigorous | Dinou 9.0.3 | 2.29 | 2.73 | 196.4 | 918.00 | 7380.00 | 0 (0%) |
| `/rigorous/ppr` | ppr-rigorous | Dinou 9.0.3 (-u) | 2.24 | 3.06 | 187.3 | 980.00 | 7800.00 | 0 (0%) |
| `/rigorous/ppr` | ppr-rigorous | Next.js 16.4.3 | 3.04 | 8.59 | 139.7 | 1095.00 | 15892.00 | 0 (0%) |
| `/rigorous/ppr-cache-slot` | ppr+slot | Dinou 9.0.3 | 2.70 | 7.11 | 190.3 | 904.00 | 10714.00 | 0 (0%) |
| `/rigorous/ppr-cache-slot` | ppr+slot | Dinou 9.0.3 (-u) | 2.57 | 9.24 | 181.0 | 944.00 | 12068.00 | 0 (0%) |
| `/rigorous/ppr-cache-slot` | ppr+slot | Next.js 16.4.3 | 3.26 | 10.44 | 107.1 | 1392.00 | 19607.00 | 0 (0%) |
| `/rigorous/hs-cache-slot` | hs+slot | Dinou 9.0.3 | 1.75 | 7.25 | 689.0 | 205.00 | 312.00 | 0 (0%) |
| `/rigorous/hs-cache-slot` | hs+slot | Dinou 9.0.3 (-u) | 1.72 | 2.69 | 693.4 | 203.00 | 328.00 | 0 (0%) |
| `/rigorous/hs-cache-slot` | hs+slot | Next.js 16.4.3 | 2.96 | 8.05 | 110.7 | 1029.00 | 19344.00 | 0 (0%) |
| `/rigorous/hs-ppr` | hs+ppr | Dinou 9.0.3 | 2.17 | 2.50 | 194.7 | 980.00 | 5787.00 | 0 (0%) |
| `/rigorous/hs-ppr` | hs+ppr | Dinou 9.0.3 (-u) | 2.22 | 3.06 | 194.7 | 964.00 | 5904.00 | 0 (0%) |
| `/rigorous/hs-ppr` | hs+ppr | Next.js 16.4.3 | 3.13 | 11.29 | 127.3 | 1164.00 | 18068.00 | 0 (0%) |
| `/rigorous/triple` | triple | Dinou 9.0.3 | 3.74 | 8.19 | 209.7 | 720.00 | 11381.00 | 0 (0%) |
| `/rigorous/triple` | triple | Dinou 9.0.3 (-u) | 4.13 | 9.55 | 211.1 | 716.00 | 11191.00 | 0 (0%) |
| `/rigorous/triple` | triple | Next.js 16.4.3 | 3.36 | 11.11 | 100.3 | 1428.00 | 21651.00 | 0 (0%) |

Load test: 200 connections, 30 s per round, 5 rounds, median across rounds. autocannon does not expose exact p95; p97.5 is used as an upper bound.

## Build, Startup, HMR, Bundle and Memory

| Metric | Dinou 9.0.3 | Dinou 9.0.3 (-u) | Next.js 16.4.3 |
| --- | --- | --- | --- |
| Production build (s, median) | 6.52 | 6.39 | 14.54 |
| Output size (MB) | 7.5 | 7.5 | 59.6 |
| Dev cold start (s, median) | 2.09 | 2.16 | 3.48 |
| HMR edit → DOM (ms, median) | 266 | 260 | 290 |
| Client JS (KiB gzip) | 94.2 | 94.2 | 182.5 |
| Client JS (KiB brotli) | 81.8 | 81.8 | 158.3 |
| Idle RSS (MB, median) | 275.1 | 275.4 | 246.5 |
| Peak RSS under load (MB) | 492.5 | 498.7 | 1019.3 |

