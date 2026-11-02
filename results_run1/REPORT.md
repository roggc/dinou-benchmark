# Benchmark Results: Dinou v9.0.3 vs. Next.js v16.4.3

Generated: 2026-11-02T21:33:43.513Z

> **Execution Environment.** Performance, build, startup, HMR, and memory figures in this report were recorded on a dedicated DigitalOcean CPU-Optimized droplet (**4 Dedicated Intel Xeon vCPUs / 8 GB RAM**, Ubuntu 24.04 LTS, provisioned via `infra/droplet-setup.sh`) across **`n = 5` independent passes** (`200` concurrent connections, `30s` per round, `5s` warmup). Functional and 3D Caching Cube verification (`36 checks × 10 runs = 360 executions`) is documented in [`report-verify.md`](../report-verify.md).

## Functional & Rigorous 3D Caching Verification

| Framework | Version | Checks Passed (10/10) | Flaky Checks | Deterministic Failures (0/10) | Total Executions Passed | Status |
| --- | --- | :---: | :---: | :---: | :---: | :---: |
| Dinou 9.0.3 | `9.0.3` | **36/36** | 0 | 0 | `360/360` (`100.0%`) | ✅ |
| Next.js 16.4.3 | `16.4.3` | **30/36** | 1 | 5 | `308/360` (`85.6%`) | ⚠️ |

### Failures & Flaky Checks Summary

- **Check #24** · Next.js 16.4.3 → `rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard` — **❌ FAIL (0/10 passed, 10/10 failed)**: router.refresh() (page-only) must NOT re-execute layout (expected 100, got 270)
- **Check #27** · Next.js 16.4.3 → `rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL` — **❌ FAIL (0/10 passed, 10/10 failed)**: wildcard refreshSlot('*', { fresh: true }) must NOT re-execute host layout or host page (got layout=999, page=999)
- **Check #28** · Next.js 16.4.3 → `rigorous-cache-slot-stampede: 6 concurrent cold-miss requests coalesce into 1 slot execution` — **⚠️ FLAKY (8/10 passed, 2/10 failed)**: expected stampede protection to execute cold 150ms slot exactly once across 6 concurrent requests, got 2
- **Check #29** · Next.js 16.4.3 → `rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh)` — **❌ FAIL (0/10 passed, 10/10 failed)**: LWW race failed in DOM: late slow request (401/stale-slow) overwrote fast request (402/fresh-fast); got seq=401 label=stale-slow
- **Check #31** · Next.js 16.4.3 → `rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back` — **❌ FAIL (0/10 passed, 10/10 failed)**: expected Page A to be served from client pageCache with 0 page RSC fetches (host=100) + slotOverride=410, got host=100 pageRscReqs=3
- **Check #33** · Next.js 16.4.3 → `rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag` — **❌ FAIL (0/10 passed, 10/10 failed)**: tag-only refreshSlot must NOT re-execute dynamic host page (expected 100, got 999)

### Complete 36-Check Verification Breakdown (`#1`–`#36`)

| Check # | Verification Check | Dinou 9.0.3 Result & Detail | Next.js 16.4.3 Result & Detail |
| :---: | :--- | :--- | :--- |
| **#1** | `ssg: / responds 200` | ✅ `10/10` PASS — 4.6 ms | ✅ `10/10` PASS — 4.3 ms |
| **#2** | `ssg: / 50 items listing` | ✅ `10/10` PASS — 50 items | ✅ `10/10` PASS — 50 items |
| **#3** | `ssg: stable HTML across requests` | ✅ `10/10` PASS — 3 identical requests | ✅ `10/10` PASS — 3 identical requests |
| **#4** | `isr: /items/1 responds 200` | ✅ `10/10` PASS — 66.1 ms | ✅ `10/10` PASS — 38.9 ms |
| **#5** | `isr: cached and stable HTML` | ✅ `10/10` PASS — 2 identical requests | ✅ `10/10` PASS — 2 identical requests |
| **#6** | `isr: prerendered route /items/42` | ✅ `10/10` PASS — correct content | ✅ `10/10` PASS — correct content |
| **#7** | `404: nonexistent & validateParams/allowISG routes` | ✅ `10/10` PASS — /this-route-does-not-exist=404 /items/999=404 /rigorous/hs/dept/invalid=404 /rigorous/hs/locked/unlisted=404 | ✅ `10/10` PASS — /this-route-does-not-exist=404 /items/999=404 /rigorous/hs/dept/invalid=404 /rigorous/hs/locked/unlisted=404 |
| **#8** | `dashboard: responds 200` | ✅ `10/10` PASS — 231.6 ms | ✅ `10/10` PASS — 240.7 ms |
| **#9** | `dashboard: is dynamic (two requests differ)` | ✅ `10/10` PASS — different timestamps | ✅ `10/10` PASS — different timestamps |
| **#10** | `dashboard: streams 3 holes after fallback` | ✅ `10/10` PASS — 3 fallbacks · 3 holes · 246.7 ms | ✅ `10/10` PASS — 3 fallbacks · 3 holes · 223.6 ms |
| **#11** | `ppr: static shell in first chunk` | ✅ `10/10` PASS — first chunk 90.17 ms | ✅ `10/10` PASS — first chunk 8.43 ms |
| **#12** | `ppr: hole arrives later (streaming)` | ✅ `10/10` PASS — shell 8.48 ms · total 233.45 ms | ✅ `10/10` PASS — shell 3.9 ms · total 216 ms |
| **#13** | `mutation: Server Function visible in browser` | ✅ `10/10` PASS — persisted and rendered | ✅ `10/10` PASS — persisted and rendered |
| **#14** | `rigorous-hs: sibling soft nav preserves layout client state & mountId` | ✅ `10/10` PASS — mountId=m-1-zluxh preserved · layoutFetches=0 | ✅ `10/10` PASS — mountId=m-1-xv4sf preserved · layoutFetches=0 |
| **#15** | `rigorous-hs: nested L2 layout, @badge slot, dynamic [deptId], locked [code] & escape hatches` | ✅ `10/10` PASS — L2 + @badge + [deptId] + [code] + reset_layout + no_layout OK | ✅ `10/10` PASS — L2 + @badge + [deptId] + [code] + reset_layout + no_layout OK |
| **#16** | `rigorous-hs: surgical revalidatePage vs revalidateLayout & lazy HTML re-composition` | ✅ `10/10` PASS — page=101 preserved · layout=102 recomposed · 0 hydration errors | ✅ `10/10` PASS — page=101 preserved · layout=102 recomposed · 0 hydration errors |
| **#17** | `rigorous-cache-slot: dynamic bypass, surgical slot refresh, shared tag, nested slots & server action prop` | ✅ `10/10` PASS — alpha/shared/nested slots + server action prop OK | ✅ `10/10` PASS — alpha/shared/nested slots + server action prop OK |
| **#18** | `rigorous-ppr: static shell, collapsed static Suspense, concurrent holes, inherited/opt-out & XSS guard` | ✅ `10/10` PASS — shell 84.12 ms · total 222.74 ms · XSS safe | ✅ `10/10` PASS — shell 19.78 ms · total 108.47 ms · XSS safe |
| **#19** | `rigorous-ppr-cache-slot: shell slots vs dynamic hole slots & nested hole slot isolation` | ✅ `10/10` PASS — shell=100 · holeSlotA=120 · nestedInner=120 | ✅ `10/10` PASS — shell=100 · holeSlotA=120 · nestedInner=120 |
| **#20** | `rigorous-hs-cache-slot: cross-axis shared tag, round-trip A->B->A slot persistence & LWW race` | ✅ `10/10` PASS — cross-axis shared tag + round-trip A->B->A slot=131 preserved | ✅ `10/10` PASS — cross-axis shared tag + round-trip A->B->A slot=131 preserved |
| **#21** | `rigorous-hs-ppr: L1 PPR layout + @sidebar hole + PPR pages + surgical revalidateLayout/Page` | ✅ `10/10` PASS — L1 PPR=141 · Page A PPR=140 · @sidebar hole OK | ✅ `10/10` PASS — L1 PPR=141 · Page A PPR=140 · @sidebar hole OK |
| **#22** | `rigorous-triple: 3D matrix surgical isolation (HS + Cache-Slot + PPR + 1s clock TTL)` | ✅ `10/10` PASS — 3D isolation + 1s TTL slots + nested L2 + 0 hydration errors | ✅ `10/10` PASS — 3D isolation + 1s TTL slots + nested L2 + 0 hydration errors |
| **#23** | `rigorous-hs: client pageCache deduplication vs <Link fresh> bypass` | ✅ `10/10` PASS — normal `<Link>`=100 (0 reqs) · `<Link fresh>`=260 · L1=100 preserved | ✅ `10/10` PASS — normal `<Link>`=100 (0 reqs) · `<Link fresh>`=260 · L1=100 preserved |
| **#24** | `rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard` | ✅ `10/10` PASS — page-only refresh (layout=100, page=270) · layout refresh (270) · ?buildId/?v intact | ❌ `0/10` PASS (`10/10` failed) — router.refresh() (page-only) must NOT re-execute layout (expected 100, got 270) |
| **#25** | `rigorous-hs: page error.tsx containment inside outlet & soft-nav recovery` | ✅ `10/10` PASS — error.tsx contained in outlet · L1 state=1 preserved across break & recovery | ✅ `10/10` PASS — error.tsx contained in outlet · L1 state=1 preserved across break & recovery |
| **#26** | `rigorous-hs-ttl: clock-based 1s Layout TTL vs 1s Page TTL surgical expiration` | ✅ `10/10` PASS — 1s layout TTL=280 (child=100) · 1s page TTL=281 (L1=100) | ✅ `10/10` PASS — 1s layout TTL=280 (child=100) · 1s page TTL=281 (L1=100) |
| **#27** | `rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL` | ✅ `10/10` PASS — wildcard refreshSlot('*')=301/302/303 (hosts=100) · static-host 1s slot=305 (host=100) | ❌ `0/10` PASS (`10/10` failed) — wildcard refreshSlot('*', { fresh: true }) must NOT re-execute host layout or host page (got layout=999, page=999) |
| **#28** | `rigorous-cache-slot-stampede: 6 concurrent cold-miss requests coalesce into 1 slot execution` | ✅ `10/10` PASS — 6 concurrent cold requests -> 1 slot execution | ⚠️ `8/10` FLAKY (`2/10` failed) — expected stampede protection to execute cold 150ms slot exactly once across 6 concurrent requests, got 2 |
| **#29** | `rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh)` | ✅ `10/10` PASS — LWW race won by Request #2 (402/fresh-fast) in both DOM and server cache | ❌ `0/10` PASS (`10/10` failed) — LWW race failed in DOM: late slow request (401/stale-slow) overwrote fast request (402/fresh-fast); got seq=401 label=stale-slow |
| **#30** | `rigorous-hs-ppr-ttl & triple-shell-slot: 1s PPR clock TTLs + surgical static-shell slot revalidateTag` | ✅ `10/10` PASS — PPR TTLs (330/331) · shell slots=340/341/342 (hosts=100) | ✅ `10/10` PASS — PPR TTLs (330/331) · shell slots=340/341/342 (hosts=100) |
| **#31** | `rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back` | ✅ `10/10` PASS — unmounted slot refreshed on Page B -> 410 on Page A (host=100) | ❌ `0/10` PASS (`10/10` failed) — expected Page A to be served from client pageCache with 0 page RSC fetches (host=100) + slotOverride=410, got host=100 pageRscReqs=3 |
| **#32** | `rigorous-hs-cache-slot-shadow-guard: slotOverrideCache yields to newer server children on router.refresh()` | ✅ `10/10` PASS — slotOverride (420) yielded to router.refresh() (421) · widget state=1 intact | ✅ `10/10` PASS — slotOverride (420) yielded to router.refresh() (421) · widget state=1 intact |
| **#33** | `rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag` | ✅ `10/10` PASS — tag-only slot refreshSlot=430 (host=100) · revalidateTag=431 | ❌ `0/10` PASS (`10/10` failed) — tag-only refreshSlot must NOT re-execute dynamic host page (expected 100, got 999) |
| **#34** | `rigorous-triple-cascade: ancestor L1 revalidateLayout cascades through L2 to nested PPR & static children` | ✅ `10/10` PASS — L1=440 cascaded through L2 to nested PPR (100) & nested static-child (100) | ✅ `10/10` PASS — L1=440 cascaded through L2 to nested PPR (100) & nested static-child (100) |
| **#35** | `rigorous-hs-concurrent-reval: simultaneous revalidateLayout + revalidatePage serialization & F5 hydration` | ✅ `10/10` PASS — concurrent revalidateLayout(450) + revalidatePage(451) aligned · 0 hydration errors | ✅ `10/10` PASS — concurrent revalidateLayout(450) + revalidatePage(451) aligned · 0 hydration errors |
| **#36** | `rigorous-hs-lazy-html-hydration: revalidateLayout lazy index.html recomposition & 0 hydration errors on co-located & child pages (hard nav)` | ✅ `10/10` PASS — co-located (/rigorous/hs, /nested) & child (/nested/page-2) lazy HTML recomposed (L1=460, L2=461, pages=100) · 0 hydration errors | ✅ `10/10` PASS — co-located (/rigorous/hs, /nested) & child (/nested/page-2) lazy HTML recomposed (L1=460, L2=461, pages=100) · 0 hydration errors |

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

