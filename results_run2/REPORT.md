# Benchmark Results: Dinou v9.0.3 vs. Next.js v16.4.3

Generated: 2026-11-02T21:33:43.590Z

> **Execution Environment.** Performance, build, startup, HMR, and memory figures in this report were recorded on a dedicated DigitalOcean CPU-Optimized droplet (**4 Dedicated Intel Xeon vCPUs / 8 GB RAM**, Ubuntu 24.04 LTS, provisioned via `infra/droplet-setup.sh`) across **`n = 5` independent passes** (`200` concurrent connections, `30s` per round, `5s` warmup). Functional and 3D Caching Cube verification (`36 checks × 10 runs = 360 executions`) is documented in [`report-verify.md`](../report-verify.md).

## Functional & Rigorous 3D Caching Verification

| Framework | Version | Checks Passed (10/10) | Flaky Checks | Deterministic Failures (0/10) | Total Executions Passed | Status |
| --- | --- | :---: | :---: | :---: | :---: | :---: |
| Dinou 9.0.3 | `9.0.3` | **36/36** | 0 | 0 | `360/360` (`100.0%`) | ✅ |
| Next.js 16.4.3 | `16.4.3` | **31/36** | 0 | 5 | `310/360` (`86.1%`) | ⚠️ |

### Failures & Flaky Checks Summary

- **Check #24** · Next.js 16.4.3 → `rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard` — **❌ FAIL (0/10 passed, 10/10 failed)**: router.refresh() (page-only) must NOT re-execute layout (expected 100, got 270)
- **Check #27** · Next.js 16.4.3 → `rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL` — **❌ FAIL (0/10 passed, 10/10 failed)**: wildcard refreshSlot('*', { fresh: true }) must NOT re-execute host layout or host page (got layout=999, page=999)
- **Check #29** · Next.js 16.4.3 → `rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh)` — **❌ FAIL (0/10 passed, 10/10 failed)**: LWW race failed in DOM: late slow request (401/stale-slow) overwrote fast request (402/fresh-fast); got seq=401 label=stale-slow
- **Check #31** · Next.js 16.4.3 → `rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back` — **❌ FAIL (0/10 passed, 10/10 failed)**: expected Page A to be served from client pageCache with 0 page RSC fetches (host=100) + slotOverride=410, got host=100 pageRscReqs=3
- **Check #33** · Next.js 16.4.3 → `rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag` — **❌ FAIL (0/10 passed, 10/10 failed)**: tag-only refreshSlot must NOT re-execute dynamic host page (expected 100, got 999)

### Complete 36-Check Verification Breakdown (`#1`–`#36`)

| Check # | Verification Check | Dinou 9.0.3 Result & Detail | Next.js 16.4.3 Result & Detail |
| :---: | :--- | :--- | :--- |
| **#1** | `ssg: / responds 200` | ✅ `10/10` PASS — 4.4 ms | ✅ `10/10` PASS — 5.2 ms |
| **#2** | `ssg: / 50 items listing` | ✅ `10/10` PASS — 50 items | ✅ `10/10` PASS — 50 items |
| **#3** | `ssg: stable HTML across requests` | ✅ `10/10` PASS — 3 identical requests | ✅ `10/10` PASS — 3 identical requests |
| **#4** | `isr: /items/1 responds 200` | ✅ `10/10` PASS — 44.9 ms | ✅ `10/10` PASS — 38.2 ms |
| **#5** | `isr: cached and stable HTML` | ✅ `10/10` PASS — 2 identical requests | ✅ `10/10` PASS — 2 identical requests |
| **#6** | `isr: prerendered route /items/42` | ✅ `10/10` PASS — correct content | ✅ `10/10` PASS — correct content |
| **#7** | `404: nonexistent & validateParams/allowISG routes` | ✅ `10/10` PASS — /this-route-does-not-exist=404 /items/999=404 /rigorous/hs/dept/invalid=404 /rigorous/hs/locked/unlisted=404 | ✅ `10/10` PASS — /this-route-does-not-exist=404 /items/999=404 /rigorous/hs/dept/invalid=404 /rigorous/hs/locked/unlisted=404 |
| **#8** | `dashboard: responds 200` | ✅ `10/10` PASS — 242.8 ms | ✅ `10/10` PASS — 258.6 ms |
| **#9** | `dashboard: is dynamic (two requests differ)` | ✅ `10/10` PASS — different timestamps | ✅ `10/10` PASS — different timestamps |
| **#10** | `dashboard: streams 3 holes after fallback` | ✅ `10/10` PASS — 3 fallbacks · 3 holes · 250.3 ms | ✅ `10/10` PASS — 3 fallbacks · 3 holes · 230 ms |
| **#11** | `ppr: static shell in first chunk` | ✅ `10/10` PASS — first chunk 28.29 ms | ✅ `10/10` PASS — first chunk 11.21 ms |
| **#12** | `ppr: hole arrives later (streaming)` | ✅ `10/10` PASS — shell 9.86 ms · total 218.08 ms | ✅ `10/10` PASS — shell 5.61 ms · total 213.67 ms |
| **#13** | `mutation: Server Function visible in browser` | ✅ `10/10` PASS — persisted and rendered | ✅ `10/10` PASS — persisted and rendered |
| **#14** | `rigorous-hs: sibling soft nav preserves layout client state & mountId` | ✅ `10/10` PASS — mountId=m-1-1lygg preserved · layoutFetches=0 | ✅ `10/10` PASS — mountId=m-1-za5r2 preserved · layoutFetches=0 |
| **#15** | `rigorous-hs: nested L2 layout, @badge slot, dynamic [deptId], locked [code] & escape hatches` | ✅ `10/10` PASS — L2 + @badge + [deptId] + [code] + reset_layout + no_layout OK | ✅ `10/10` PASS — L2 + @badge + [deptId] + [code] + reset_layout + no_layout OK |
| **#16** | `rigorous-hs: surgical revalidatePage vs revalidateLayout & lazy HTML re-composition` | ✅ `10/10` PASS — page=101 preserved · layout=102 recomposed · 0 hydration errors | ✅ `10/10` PASS — page=101 preserved · layout=102 recomposed · 0 hydration errors |
| **#17** | `rigorous-cache-slot: dynamic bypass, surgical slot refresh, shared tag, nested slots & server action prop` | ✅ `10/10` PASS — alpha/shared/nested slots + server action prop OK | ✅ `10/10` PASS — alpha/shared/nested slots + server action prop OK |
| **#18** | `rigorous-ppr: static shell, collapsed static Suspense, concurrent holes, inherited/opt-out & XSS guard` | ✅ `10/10` PASS — shell 95.21 ms · total 234.07 ms · XSS safe | ✅ `10/10` PASS — shell 20.69 ms · total 85.74 ms · XSS safe |
| **#19** | `rigorous-ppr-cache-slot: shell slots vs dynamic hole slots & nested hole slot isolation` | ✅ `10/10` PASS — shell=100 · holeSlotA=120 · nestedInner=120 | ✅ `10/10` PASS — shell=100 · holeSlotA=120 · nestedInner=120 |
| **#20** | `rigorous-hs-cache-slot: cross-axis shared tag, round-trip A->B->A slot persistence & LWW race` | ✅ `10/10` PASS — cross-axis shared tag + round-trip A->B->A slot=131 preserved | ✅ `10/10` PASS — cross-axis shared tag + round-trip A->B->A slot=131 preserved |
| **#21** | `rigorous-hs-ppr: L1 PPR layout + @sidebar hole + PPR pages + surgical revalidateLayout/Page` | ✅ `10/10` PASS — L1 PPR=141 · Page A PPR=140 · @sidebar hole OK | ✅ `10/10` PASS — L1 PPR=141 · Page A PPR=140 · @sidebar hole OK |
| **#22** | `rigorous-triple: 3D matrix surgical isolation (HS + Cache-Slot + PPR + 1s clock TTL)` | ✅ `10/10` PASS — 3D isolation + 1s TTL slots + nested L2 + 0 hydration errors | ✅ `10/10` PASS — 3D isolation + 1s TTL slots + nested L2 + 0 hydration errors |
| **#23** | `rigorous-hs: client pageCache deduplication vs <Link fresh> bypass` | ✅ `10/10` PASS — normal `<Link>`=100 (0 reqs) · `<Link fresh>`=260 · L1=100 preserved | ✅ `10/10` PASS — normal `<Link>`=100 (0 reqs) · `<Link fresh>`=260 · L1=100 preserved |
| **#24** | `rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard` | ✅ `10/10` PASS — page-only refresh (layout=100, page=270) · layout refresh (270) · ?buildId/?v intact | ❌ `0/10` PASS (`10/10` failed) — router.refresh() (page-only) must NOT re-execute layout (expected 100, got 270) |
| **#25** | `rigorous-hs: page error.tsx containment inside outlet & soft-nav recovery` | ✅ `10/10` PASS — error.tsx contained in outlet · L1 state=1 preserved across break & recovery | ✅ `10/10` PASS — error.tsx contained in outlet · L1 state=1 preserved across break & recovery |
| **#26** | `rigorous-hs-ttl: clock-based 1s Layout TTL vs 1s Page TTL surgical expiration` | ✅ `10/10` PASS — 1s layout TTL=280 (child=100) · 1s page TTL=281 (L1=100) | ✅ `10/10` PASS — 1s layout TTL=280 (child=100) · 1s page TTL=281 (L1=100) |
| **#27** | `rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL` | ✅ `10/10` PASS — wildcard refreshSlot('*')=301/302/303 (hosts=100) · static-host 1s slot=305 (host=100) | ❌ `0/10` PASS (`10/10` failed) — wildcard refreshSlot('*', { fresh: true }) must NOT re-execute host layout or host page (got layout=999, page=999) |
| **#28** | `rigorous-cache-slot-stampede: 6 concurrent cold-miss requests coalesce into 1 slot execution` | ✅ `10/10` PASS — 6 concurrent cold requests -> 1 slot execution | ✅ `10/10` PASS — 6 concurrent cold requests -> 1 slot execution |
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

