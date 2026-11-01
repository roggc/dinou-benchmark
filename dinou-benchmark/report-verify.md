# Rigorous 3D Caching & Streaming Verification Report: Dinou v9.0.3 vs. Next.js v16.4.3

**Date:** November 1, 2026  
**Benchmark Repository:** `dinou-benchmark` (`dev` branch)  
**Frameworks Compared:**
- **Dinou v9.0.3** (`apps/dinou-9`) — React 19 RSC framework
- **Next.js v16.4.3** (`apps/next` with `cacheComponents: true` / `"use cache"` / PPR enabled) — React 19 App Router

> **Methodological Note on Why `dinou-9-u` Is Excluded From Verification Tables:**  
> While the repository includes `apps/dinou-9-u` (the unvendorized distribution of Dinou) for install-time and disk-size benchmarks, its framework runtime and application code are 100% identical to `apps/dinou-9` (differing only in whether third-party dependencies are resolved from `node_modules` instead of pre-bundled). Including both `dinou-9` and `dinou-9-u` in multi-run verification would subject Dinou's codebase to **twice as many verification passes (`2×`)** as Next.js, creating an asymmetric sample size that would statistically penalize Dinou when evaluating non-deterministic race conditions. Therefore, `scripts/verify.mjs` benchmarks **Dinou v9.0.3 (`dinou-9`)** and **Next.js v16.4.3 (`next`)** head-to-head with the exact same number of executions (**13 full runs × 36 checks = 468 check executions per framework**).

---

## 1. Executive Summary

To evaluate both frameworks beyond synthetic happy-path benchmarks, we implemented the complete **3D Caching & Streaming Matrix** defined across the eight `rigurous-*.md` reference specifications (`rigurous-hs.md`, `rigurous-cache-slot.md`, `rigurous-ppr.md`, `rigurous-sinergy.md`, `rigurous-sinergy-hs-cache-slot.md`, `rigurous-sinergy-hs-ppr.md`, `rigurous-triple-sinergy.md`, and `rigurous-revalidation-scenarios.md`) and expanded `scripts/verify.mjs` from **13 baseline checks** to **36 end-to-end Playwright & HTTP verification checks**.

The 36 checks test three orthogonal caching axes—**Horizontal Segmentation (Layouts vs. Pages)**, **Vertical Segmentation (`<DinouCacheSlot>` / `"use cache"` Micro-ISR)**, and **Partial Prerendering (PPR)**—individually, in all three pairwise combinations, and in full **Triple Synergy**, under both **Clock-Based TTL Expiration (`revalidate = 1s`)** and **On-Demand Surgical Revalidation (`revalidatePage`, `revalidateLayout`, `revalidatePath`, `revalidateTag`, `refreshSlot`)**, including concurrency stampedes, out-of-order race conditions, unmounted cross-route slot refreshes, `slotOverrideCache` shadowing guards, tag-only slot boundaries, multi-level ancestor layout cascades, simultaneous revalidation queues, and lazy `index.html` re-composition with zero hydration mismatch on hard navigation across co-located and descendant pages.

### 1.1 Final Verification Scoreboard (36 Checks Across 13 Full Runs = 468 Check Executions per Framework)

Across **13 complete verification runs** (3 single-pass runs + 10 consecutive passes via `node scripts/verify.mjs --only=dinou-9,next --runs=10`, restoring clean post-build disk artifacts and restarting a fresh server process before every run):

| Framework | Version | Baseline Checks (1 to 13) | Core 3D Rigorous Suites (14 to 22) | Deep Stress & Concurrency Edge Cases (23 to 36) | Total Check Executions (`13 × 36`) | Check Breakdown (`36` Total) | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dinou 9.0.3** (`apps/dinou-9`) | `9.0.3` | 13 ✅ on 13 runs | 9 ✅ on 13 runs | 14 ✅ on 13 runs | **468 ✅** (`100.0%`) | **36 ✅** | **✅ PASS (100% deterministic, `0` flaky)** |
| **Next.js 16.4.3** (`apps/next`) | `16.4.3` | 13 ✅ on 13 runs | 9 ✅ on 13 runs | 8 ✅ / 5 ❌ / 1 ⚠️ on 13 runs | **400 ✅ / 68 ❌** (`85.5%`) | **30 ✅ / 5 ❌ / 1 ⚠️** | **❌ FAIL (5 deterministic fails on 13 runs + ⚠️ 1 flaky: `3 Fail of 13 execs`)** |

---

### 1.2 Complete Coverage of the 7 Vertices of the 3D Caching & Streaming Cube ($2^3 - 1 = 7$ Combinations)

Because the architecture forms a **3D Cube** across three orthogonal axes—**X: Horizontal Segmentation (`HS`)**, **Y: Vertical Segmentation (`Cache-Slot`)**, and **Z: Temporal/Streaming Segmentation (`PPR`)**—there are **$2^3 - 1 = 7$ non-empty architectural combinations**: **3 individual axes**, **3 pairwise synergies**, and **1 triple synergy**. Every single one of those 7 combinations is exhaustively tested in `scripts/verify.mjs` across client navigation, clock-based TTL expiration (`revalidate = 1s`), server on-demand surgical revalidation (`revalidatePage`, `revalidateLayout`, `revalidatePath`, `revalidateTag`), live client refresh (`router.refresh`, `refreshSlot`), concurrency/race conditions, and hard-reload (`F5`) React hydration:

| Cube Vertex / Synergy | Axes Combined | Checks in `scripts/verify.mjs` | Dinou 9.0.3 | Next.js 16.4.3 |
| :--- | :---: | :--- | :---: | :---: |
| **1. Individual Axis X — Horizontal Segmentation (`HS`)** | `HS` | **Checks 7, 14, 15, 16, 23, 24, 25, 26, 35, 36** *(10 checks)* | **10 ✅** | 9 ✅ / **1 ❌** *(Check 24)* |
| **2. Individual Axis Y — Vertical Segmentation (`Cache-Slot`)** | `Cache-Slot` | **Checks 17, 27, 28, 33** *(4 checks)* | **4 ✅** | 1 ✅ / **2 ❌** *(27, 33)* / **1 ⚠️** *(28)* |
| **3. Individual Axis Z — Partial Prerendering (`PPR`)** | `PPR` | **Checks 11, 12, 18** *(3 checks)* | **3 ✅** | **3 ✅** |
| **4. Pairwise Synergy #1 — `PPR + Cache-Slot`** | `PPR × Slot` | **Check 19** *(+ clock TTL in Checks 22 & 30)* | **1 ✅** | **1 ✅** |
| **5. Pairwise Synergy #2 — `HS + Cache-Slot`** | `HS × Slot` | **Checks 20, 29, 31, 32** *(4 checks)* | **4 ✅** | 2 ✅ / **2 ❌** *(Checks 29, 31)* |
| **6. Pairwise Synergy #3 — `HS + PPR`** | `HS × PPR` | **Checks 21, 30 (Part 1)** *(2 checks)* | **2 ✅** | **2 ✅** |
| **7. Triple Synergy — `HS + Cache-Slot + PPR`** | `HS × Slot × PPR` | **Checks 22, 30 (Part 2), 34** *(3 multi-scenario checks)* | **3 ✅** | **3 ✅** *(requires RAM warmup)* |

#### Detailed Breakdown of What Is Verified in Each of the 7 Cube Vertices:

1. **Individual Axis X — Pure Horizontal Segmentation (`HS`: Layouts vs. Pages)**
   - **Checks:** **7, 14, 15, 16, 23, 24, 25, 26, 35, 36**
   - **What is verified:**
     - Sibling soft navigation (`Page A → Page B → Page A`) preserving layout client `useState` and `mountId` with **`0` `/____rsc_layout____` network fetches** (**Check 14**).
     - Multi-level `L1 → L2` layout nesting, parallel `@badge` slot, dynamic `[deptId]`, locked static `[code]` (`allowISG = false`), `validateParams` 404 guards, and layout escape hatches (`reset_layout` and `no_layout`) (**Checks 7 & 15**).
     - Client `pageCache` deduplication (`0` fetches on repeat soft-nav) vs. `<Link fresh>` bypass (**Check 23**).
     - `router.refresh()` (page-only) vs. `router.refresh({ layout: true })` (layout + page) and protection of user query parameters `?buildId` & `?v` (**Check 24** — *Fails 100% on Next.js*).
     - Error boundary containment (`error.tsx` inside page outlet keeping parent layout interactive + soft-nav recovery) (**Check 25**).
     - Independent clock-based `1s` Layout TTL expiration (without re-executing the child page) vs. `1s` Page TTL expiration (without re-executing the parent layout) (**Check 26**).
     - Surgical `revalidatePage`, `revalidateLayout`, `revalidatePath`, concurrent `revalidateLayout + revalidatePage` serialization (**Checks 16 & 35**), and lazy `index.html` re-composition with **`0` React hydration errors** on hard navigation (`F5` / `page.goto`) across co-located and descendant pages (`L1` and `L2`) while proving `page.tsx` does not re-execute (`999` poison guard) (**Check 36**).

2. **Individual Axis Y — Pure Vertical Segmentation (`Cache-Slot`: `<DinouCacheSlot>` & `refreshSlot`)**
   - **Checks:** **17, 27, 28, 33**
   - **What is verified:**
     - Real-time dynamic bypass (`revalidate={0}`), surgical slot refresh (`refreshSlot` by ID and by tag) inside dynamic layouts/pages without re-executing the host (`999`), shared multi-slot tags, nested `Outer → Inner` slot isolation, preserved client `useState` inside the slot across live `refreshSlot`, and `"use server"` functions passed as props inside a cached slot (**Check 17**).
     - Wildcard `refreshSlot("*", { fresh: true })` and clock-based `1s` slot TTL expiration inside a standalone static host page (`ppr = false`) without re-executing the host page or `3600s` sibling slots (**Check 27** — *Fails 100% on Next.js*).
     - Cold-miss concurrency stampede protection (`6` simultaneous requests coalesce into `1` slot execution) (**Check 28** — *Flaky `3 Fail of 13 execs` on Next.js*).
     - Tag-only `<DinouCacheSlot tags={["cs-tag-only"]}>` (no `id` prop) live `refreshSlot` and server `revalidateTag` without re-executing the dynamic host page (**Check 33** — *Fails 100% on Next.js*).

3. **Individual Axis Z — Pure Temporal / Streaming Segmentation (`PPR`: Static Shell + Dynamic `<Suspense>` Holes)**
   - **Checks:** **11, 12, 18**
   - **What is verified:**
     - Raw HTTP stream separation (`shellPart` in first packet vs. deferred `streamPart` `<template>` + `<script>` chunks), static `<Suspense>` boundaries collapsing into `shell.html` without shifting dynamic hole IDs, concurrent parallel `<Suspense>` holes (`max(120ms, 120ms)` instead of sequential `240ms`), inherited PPR vs. explicit `export const ppr = false` opt-out, and XSS `<script>` breakout protection (`</script><script>` escaped inside streamed hole payloads) (**Checks 11, 12 & 18**).

4. **Pairwise Synergy #1 — `PPR + Cache-Slot` (Streaming + Vertical Micro-ISR)**
   - **Checks:** **19** *(plus clock TTL assertions in **22 & 30**)*
   - **What is verified:**
     - 3-tier hybrid rendering on a single route: `<DinouCacheSlot>` baked into the **PPR Static Shell**, per-request **Dynamic `<Suspense>` Hole**, and `<DinouCacheSlot>` (both single and nested `Outer → Inner`) **inside a Dynamic `<Suspense>` Hole**.
     - Surgical `revalidateTag` differentiation: invalidating a slot inside a dynamic hole deletes only `slots/<id>` (leaving `shell.html` intact for instant `0ms TTFB`), whereas invalidating a static-shell slot updates the slot and regenerates `shell.html` (`{ onlyRefreshSlots: true }`) without re-executing the host page.
     - Live client `refreshSlot` across both static-shell slots and already-streamed dynamic-hole slots without losing React client state.

5. **Pairwise Synergy #2 — `HS + Cache-Slot` (Horizontal Layouts/Pages + Vertical Micro-ISR)**
   - **Checks:** **20, 29, 31, 32**
   - **What is verified:**
     - Cross-axis shared tag between a Layout Slot and a Page Slot (`revalidateTag` and `refreshSlot` update both simultaneously without re-executing either the layout host or the page host), plus `Page A → Page B → Page A` round-trip persistence of live-refreshed slots in `slotOverrideCache` (**Check 20**).
     - Out-of-order concurrency race (`250ms` slow vs. `10ms` fast `refreshSlot`) enforcing monotonic Last-Write-Wins (LWW) in both the DOM and disk cache (**Check 29** — *Fails 100% on Next.js*).
     - Unmounted cross-route `refreshSlot` (refreshing Page A's slot while viewing Page B, then soft-navigating back to Page A with `0` page RSC network requests and the updated slot already in `slotOverrideCache`) (**Check 31** — *Fails 100% on Next.js*).
     - `slotOverrideCache` shadowing guard (`baseChildren === children`): when `router.refresh()` delivers newer server children (`421`) after a local `refreshSlot` (`420`), the boundary yields to the newer server payload while keeping internal client `useState` intact (**Check 32**).

6. **Pairwise Synergy #3 — `HS + PPR` (Horizontal Layouts/Pages + Parallel `@slot` Streaming + PPR)**
   - **Checks:** **21, 30 (Part 1)**
   - **What is verified:**
     - `L1` PPR layout with a parallel `@sidebar` dynamic `<Suspense>` hole + PPR child pages (`Page A`, `Page B`) + static opt-out child (`ppr = false`), soft navigation preserving both `L1` layout state and `@sidebar` state, surgical `revalidateLayout` vs. `revalidatePage` on PPR routes (**Check 21**), and independent `1s` clock TTL expiration of a PPR Layout shell vs. a PPR Page shell (**Check 30, Part 1**).

7. **Triple Synergy (The Core of the Cube) — `HS + Cache-Slot + PPR`**
   - **Checks:** **22, 30 (Part 2), 34**
   - **What is verified:**
     - Simultaneous coexistence of all 3 axes on `/rigorous/triple`: `L1` PPR layout + `L1` layout `<DinouCacheSlot>` + PPR children (`PPR A`, `PPR B`) with static-shell slots and dynamic `<Suspense>` holes containing single and nested (`Outer → Inner`) slots with prop-passed `"use server"` actions + static opt-out children (`Static A`, `Static B` with `ppr = false`) hosting their own slots + standalone `no_layout` PPR route (**Check 22**).
     - Cross-mode horizontal soft navigation (`PPR A → PPR B → Static A → Static B → PPR A`) with `0` layout network fetches, surgical invalidation of every individual piece while poisoning all other counters to `999`, `1s` clock TTL expiration of slots inside both the PPR static shell and PPR dynamic hole (**Check 22**), surgical `revalidateTag` on a slot inside Static Page B under the PPR layout without re-executing Static Page B (**Check 30, Part 2**), and multi-level `L1 → L2` ancestor `revalidateLayout` cascade into nested PPR (`/rigorous/triple/nested`) and nested Static (`/rigorous/triple/nested/static-child`) routes while preserving `L2`'s `<DinouCacheSlot>` and both nested child pages untouched at `100` (**Check 34**).

---

## 2. Complete 36-Check Verification Matrix (13 Runs per Framework)

| # | Check Name in `scripts/verify.mjs` | Dimension / Suite | Dinou 9.0.3 (`13` runs) | Next.js 16.4.3 (`13` runs) |
| :-: | :--- | :--- | :---: | :---: |
| 1 | `ssg: / responds 200` | Baseline SSG | 100% ✅ PASS (4.6 ms) | 100% ✅ PASS (4.3 ms) |
| 2 | `ssg: / 50 items listing` | Baseline SSG | 100% ✅ PASS | 100% ✅ PASS |
| 3 | `ssg: stable HTML across requests` | Baseline SSG | 100% ✅ PASS | 100% ✅ PASS |
| 4 | `isr: /items/1 responds 200` | Baseline ISR | 100% ✅ PASS | 100% ✅ PASS |
| 5 | `isr: cached and stable HTML` | Baseline ISR | 100% ✅ PASS | 100% ✅ PASS |
| 6 | `isr: prerendered route /items/42` | Baseline ISR | 100% ✅ PASS | 100% ✅ PASS |
| 7 | `404: nonexistent & validateParams/allowISG routes` | Baseline + HS Guards | 100% ✅ PASS | 100% ✅ PASS |
| 8 | `dashboard: responds 200` | Baseline Dynamic SSR | 100% ✅ PASS (231.6 ms) | 100% ✅ PASS (240.7 ms) |
| 9 | `dashboard: is dynamic (two requests differ)` | Baseline Dynamic SSR | 100% ✅ PASS | 100% ✅ PASS |
| 10 | `dashboard: streams 3 holes after fallback` | Baseline Streaming | 100% ✅ PASS | 100% ✅ PASS |
| 11 | `ppr: static shell in first chunk` | Baseline PPR | 100% ✅ PASS | 100% ✅ PASS |
| 12 | `ppr: hole arrives later (streaming)` | Baseline PPR | 100% ✅ PASS | 100% ✅ PASS |
| 13 | `mutation: Server Function visible in browser` | Baseline Server Actions | 100% ✅ PASS | 100% ✅ PASS |
| 14 | `rigorous-hs: sibling soft nav preserves layout client state & mountId` | Suite 1 · HS | 100% ✅ PASS (`layoutFetches=0`) | 100% ✅ PASS (`layoutFetches=0`) |
| 15 | `rigorous-hs: nested L2 layout, @badge slot, dynamic [deptId], locked [code] & escape hatches` | Suite 1 · HS | 100% ✅ PASS | 100% ✅ PASS |
| 16 | `rigorous-hs: surgical revalidatePage vs revalidateLayout & lazy HTML re-composition` | Suite 1 · HS | 100% ✅ PASS (`0` hydr. errors) | 100% ✅ PASS (`0` hydr. errors) |
| 17 | `rigorous-cache-slot: dynamic bypass, surgical slot refresh, shared tag, nested slots & server action prop` | Suite 2 · Cache-Slot | 100% ✅ PASS | 100% ✅ PASS |
| 18 | `rigorous-ppr: static shell, collapsed static Suspense, concurrent holes, inherited/opt-out & XSS guard` | Suite 3 · PPR | 100% ✅ PASS (`XSS safe`) | 100% ✅ PASS (`XSS safe`) |
| 19 | `rigorous-ppr-cache-slot: shell slots vs dynamic hole slots & nested hole slot isolation` | Suite 4 · PPR + Slot | 100% ✅ PASS | 100% ✅ PASS |
| 20 | `rigorous-hs-cache-slot: cross-axis shared tag, round-trip A->B->A slot persistence & LWW race` | Suite 5 · HS + Slot | 100% ✅ PASS | 100% ✅ PASS |
| 21 | `rigorous-hs-ppr: L1 PPR layout + @sidebar hole + PPR pages + surgical revalidateLayout/Page` | Suite 6 · HS + PPR | 100% ✅ PASS | 100% ✅ PASS |
| 22 | `rigorous-triple: 3D matrix surgical isolation (HS + Cache-Slot + PPR + 1s clock TTL)` | Suite 7 · Triple Synergy | 100% ✅ PASS (`0` hydr. errors) | 100% ✅ PASS (`0` hydr. errors) |
| 23 | `rigorous-hs: client pageCache deduplication vs <Link fresh> bypass` | Deep Stress #1 · HS | 100% ✅ PASS (`0` reqs on cached) | 100% ✅ PASS (`0` reqs on cached) |
| 24 | `rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard` | Deep Stress #2 · HS | **100% ✅ PASS** (`layout=100, page=270`) | **100% ❌ FAIL** (`layout=270`) |
| 25 | `rigorous-hs: page error.tsx containment inside outlet & soft-nav recovery` | Deep Stress #3 · HS | 100% ✅ PASS | 100% ✅ PASS |
| 26 | `rigorous-hs-ttl: clock-based 1s Layout TTL vs 1s Page TTL surgical expiration` | Deep Stress #4 · HS TTL | 100% ✅ PASS (`280/100`, `281/100`) | 100% ✅ PASS (`280/100`, `281/100`) |
| 27 | `rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL` | Deep Stress #5 · Slot | **100% ✅ PASS** (`hosts=100`) | **100% ❌ FAIL** (`hosts=999`) |
| 28 | `rigorous-cache-slot-stampede: 6 concurrent cold-miss requests coalesce into 1 slot execution` | Deep Stress #6 · Stampede | **100% ✅ PASS** | **⚠️ FLAKY** (`76.9% ✅ · 23.1% ❌`) |
| 29 | `rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh)` | Deep Stress #7 · LWW Race | **100% ✅ PASS** (`402/fresh-fast`) | **100% ❌ FAIL** (`401/stale-slow`) |
| 30 | `rigorous-hs-ppr-ttl & triple-shell-slot: 1s PPR clock TTLs + surgical static-shell slot revalidateTag` | Deep Stress #8 · Triple + TTL | 100% ✅ PASS (`330/331`, `340/341/342`) | 100% ✅ PASS (`330/331`, `340/341/342`) |
| 31 | `rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back` | Deep Stress #9 · HS + Slot | **100% ✅ PASS** (`0` page RSC reqs) | **100% ❌ FAIL** (`pageRscReqs=1–3`) |
| 32 | `rigorous-hs-cache-slot-shadow-guard: slotOverrideCache yields to newer server children on router.refresh()` | Deep Stress #10 · HS + Slot | 100% ✅ PASS (`420 → 421`, state=1) | 100% ✅ PASS (`420 → 421`, state=1) |
| 33 | `rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag` | Deep Stress #11 · Slot | **100% ✅ PASS** (`host=100, slot=430`) | **100% ❌ FAIL** (`host=999`) |
| 34 | `rigorous-triple-cascade: ancestor L1 revalidateLayout cascades through L2 to nested PPR & static children` | Deep Stress #12 · Triple Cascade | 100% ✅ PASS (`L1=440`, children=`100`) | 100% ✅ PASS (`L1=440`, children=`100`) |
| 35 | `rigorous-hs-concurrent-reval: simultaneous revalidateLayout + revalidatePage serialization & F5 hydration` | Deep Stress #13 · Concurrency | 100% ✅ PASS (`450/451`, `0` hydr. err) | 100% ✅ PASS (`450/451`, `0` hydr. err) |
| 36 | `rigorous-hs-lazy-html-hydration: revalidateLayout lazy index.html recomposition & 0 hydration errors on co-located & child pages (hard nav)` | Deep Stress #14 · Lazy HTML + Hydr. | 100% ✅ PASS (`L1=460, L2=461`, `0` hydr. err) | 100% ✅ PASS (`L1=460, L2=461`, `0` hydr. err) |

### 2.1 Real-World User Experience & Production Translation of All 36 Checks

To connect the technical benchmark assertions above to everyday web development, the table below translates each of the **36 verification checks** into a concrete real-world scenario, explaining **what passing solves for the user (`✅ PASS`)** and **what problem the user or production server suffers when it fails (`❌ FAIL`)**:

| # | Real-World Web Scenario | What Passing Solves (`✅ PASS`) | What the User Suffers When It Fails (`❌ FAIL`) |
| :-: | :--- | :--- | :--- |
| **1** | **Landing / Marketing Home Page (`SSG`)** | Instant sub-5ms page load directly from pre-rendered HTML on disk/CDN. | Blank screen, 500 error, or slow on-demand server rendering on every visit. |
| **2** | **Product Catalog / Blog Index Listing** | All 50 catalog items arrive fully rendered in the initial HTML for SEO and instant first paint. | Missing items, incomplete catalog rendering, or client-only waterfall fetches. |
| **3** | **Repeat Visits to a Static Page** | Deterministic, byte-identical cached HTML across visitors with zero server CPU waste. | Unnecessary server re-execution on every request, inflating TTFB and hosting bills. |
| **4** | **E-Commerce Product Detail Page (`ISR /items/1`)** | On-demand generated product page loads with 200 OK and caches itself for subsequent shoppers. | 404/500 on valid product URLs or inability to render dynamic route parameters. |
| **5** | **Cached Product Page Under Repeat Traffic** | Second and subsequent shoppers receive the cached ISR snapshot instantly without hitting the database. | Every shopper triggers a redundant database query, degrading response time under load. |
| **6** | **Build-Time Pre-Rendered Popular Item (`/items/42`)** | Top-selling products pre-built at deploy time respond immediately on first request with zero cold-start delay. | First visitor after deploy suffers a slow cold-generation penalty. |
| **7** | **Invalid URLs, Malformed Params & Locked Campaigns (`validateParams` / `allowISG=false`)** | Typoed URLs or unauthorized campaign codes immediately return a clean `404` without polluting the disk cache. | Server crashes, caches garbage files on disk (cache-poisoning DoS), or leaks unintended fallback UI. |
| **8** | **Live Account / Analytics Dashboard (`Dynamic SSR`)** | Authenticated dashboard responds reliably with live per-request user data. | Dashboard fails to render or serves broken/empty metrics. |
| **9** | **Per-Request Freshness on Live Dashboard** | Refreshing a live trading or operations dashboard always reflects up-to-the-second server state. | User sees stale cached balances or outdated operational metrics from a previous user/request. |
| **10** | **Progressive Streaming of Slow Dashboard Widgets** | Header and layout appear immediately while 3 slow database/API widgets stream in progressively over time. | User stares at a blank white browser tab until the slowest backend query finishes. |
| **11** | **E-Commerce Product Page Shell (`PPR` First Chunk)** | Navigation bar, product title, and static description appear in the very first network packet (`~5 ms`). | Static page chrome is blocked behind slow personalized recommendations or cart queries. |
| **12** | **Personalized Cart / Stock Indicator Inside PPR Page** | Dynamic live stock/price streams into the already-visible static page shell as soon as ready. | Dynamic hole never resolves (infinite skeleton spinner) or blocks the initial HTML response. |
| **13** | **Submitting a Form / "Add Item" Action (`Server Function`)** | User submits a form and immediately sees the newly created item reflected in the UI without a full page reload. | Form submission silently fails, requires manual `F5` reload, or shows outdated list data. |
| **14** | **Clicking Between Tabs Sharing a Persistent Sidebar/Audio Player (`HS` Soft Nav)** | Search input text, scroll position, and audio/video state inside the shared layout remain intact with `0` layout network fetches. | Sidebar flashes, resets its scroll/input state, or re-fetches expensive layout data on every tab click. |
| **15** | **Multi-Level Enterprise Portal (`L1 → L2`, `@badge` Parallel Slot, `reset_layout`, `no_layout`)** | Sub-departments inherit headers/badges cleanly, while standalone `/print` or `/login` routes opt out of parent chrome without moving folders. | Print views or standalone popups accidentally render the main app navbar/sidebar, or parallel notification badges fail to render. |
| **16** | **Webhook Updating Only Page Content vs. Only Navbar Menu (`revalidatePage` vs `revalidateLayout`)** | Editing an article only regenerates the article; editing the global navbar updates the navbar across pages without re-running expensive article queries. | Updating a single typo in a blog post forces the server to re-run global layout queries, or updating a navbar causes React hydration crashes on `F5`. |
| **17** | **Live Stock Ticker Inside a Cached Page & Cached Pricing Table Inside a Live Page (`Cache-Slot`)** | A dynamic checkout page embeds a cached pricing table without re-querying it on every hit, and clicking "Refresh Widget" updates only that widget. | Either the whole page must be uncached (slow) or the whole page must be static (stale), and refreshing one widget forces the entire page to re-run. |
| **18** | **PPR Page With Mixed Cached/Uncached `<Suspense>` & User-Supplied JSON/HTML (`XSS Guard`)** | Fast static `<Suspense>` blocks collapse into the initial shell; slow dynamic holes stream in parallel; malicious `</script><script>` payloads are safely escaped. | Unnecessary loading skeletons flash for already-cached data, slow holes run sequentially instead of in parallel, or an attacker achieves Cross-Site Scripting (XSS). |
| **19** | **PPR Page Combining Cached Shell Widgets and Cached Streaming Widgets (`PPR + Slot`)** | Widgets in the static shell and widgets inside streamed `<Suspense>` holes can each be refreshed independently without disturbing the rest of the page. | Refreshing a small badge inside a streamed hole invalidates the entire pre-rendered page shell or re-runs unrelated widgets. |
| **20** | **Shared Promo Banner Across Layout & Multiple Pages (`HS + Cache-Slot`)** | Updating a shared promo tag updates the banner in both the header and page body, and navigating `Page A → Page B → Page A` preserves the user's refreshed widget state. | Promo banner shows conflicting prices in the header vs. body, or navigating to another tab and back reverts the widget to old stale data. |
| **21** | **App Shell With Streaming `@sidebar` Notification Feed + PPR Content Pages (`HS + PPR`)** | Static layout shell and static page shell paint immediately while the `@sidebar` feed and page holes stream independently. | A slow notification feed in the sidebar blocks the entire page navigation or forces full-route re-execution on layout updates. |
| **22** | **Full 3D Production App (`HS + Cache-Slot + PPR + 1s TTL`)** | Layouts, pages, PPR shells, dynamic holes, and micro-cached slots coexist and expire/revalidate surgically with zero hydration errors. | Updating or expiring one layer leaks into other layers, causing stale UI, redundant database load, or client hydration mismatches. |
| **23** | **Instant Back/Forward Tab Switching vs. Explicit "Reload Tab" Button (`pageCache` vs `<Link fresh>`)** | Normal tab clicks are instant (`0 ms`, `0` network requests from client cache), while a `<Link fresh>` button explicitly fetches fresh server data. | Either every tab click makes a redundant network round-trip (sluggish UX) or the user has no way to force-fetch fresh data when needed. |
| **24** | **Clicking "Refresh Table" on a Filtered View (`router.refresh()` Page-Only vs Layout + Query Guard)** | Refreshing a data table re-fetches only the page data while keeping the dynamic parent layout untouched and preserving `?filter=...&v=...` URL params. | **❌ In Next.js (`100% FAIL`):** Clicking "Refresh Table" forces the parent layout (user session, org tree, sidebar) to re-run on the server on every click. |
| **25** | **A Broken Third-Party API on One Tab (`error.tsx` Containment & Recovery)** | Only the inner page outlet shows the error fallback; the top navbar/sidebar stays interactive so the user can click another tab and recover immediately. | An error in one sub-page destroys the entire app chrome, stranding the user on a dead screen requiring a manual URL edit or hard reload. |
| **26** | **Independent Background Expiration of Header Weather (1s TTL) vs. Article Body (1h TTL)** | When the header's TTL expires, only the header regenerates; when the page's TTL expires, only the page regenerates. | Whenever a short-lived header badge expires, the server is forced to re-generate the entire expensive article or catalog page from scratch. |
| **27** | **"Refresh All Widgets" Button on a Live Dashboard (`refreshSlot('*', { fresh: true })`)** | All cached sub-widgets update in place simultaneously without re-executing the expensive host layout or host page. | **❌ In Next.js (`100% FAIL`):** Refreshing widgets from the client forces a full-route `router.refresh()`, re-executing the dynamic host layout and dynamic host page (`999`). |
| **28** | **Flash-Sale Traffic Spike When Cache Expires (`6` Concurrent Requests / Stampede Protection)** | When 100 users hit an expired product widget at the exact same millisecond, the database query runs **once** and all users share the result. | **⚠️ In Next.js (`FLAKY — 23.1% FAIL`):** A background `<Suspense>` render from a prior Server Action leaks into the cold window, executing the expensive query multiple times under load. |
| **29** | **User Rapidly Clicking Filters: Slow Query (`250ms`) Followed by Fast Query (`10ms`) (`LWW Race`)** | The UI and disk cache deterministically keep the user's **latest** click (`402 / fresh-fast`), discarding the late response from the first click (`401 / stale-slow`). | **❌ In Next.js (`100% FAIL`):** The user clicks Filter B (`10ms`), sees Filter B briefly, and `190ms` later the slow response from Filter A (`250ms`) arrives and **overwrites the screen with stale data**. |
| **30** | **Micro-Widget Expiration Inside a Static/PPR Page After Server Restart (`1s PPR TTL + Shell Slot`)** | Updating a small "Last Updated" or price slot inside a static page updates only that slot without re-running the static host page, even right after a server deploy/restart. | Without persistent slot shells (or RAM warmup), invalidating a small widget after a server restart triggers a cold miss that re-executes the entire host page. |
| **31** | **Background Notification Updating Tab A While User Is Viewing Tab B (`Unmounted Slot Refresh`)** | When a live event updates a widget belonging to Tab A while the user is on Tab B, returning to Tab A is instant (`0` page network requests) and shows the updated widget. | **❌ In Next.js (`100% FAIL`):** Invalidating Tab A's widget tag purges the entire client Router Cache, so clicking back to Tab A incurs a full network re-fetch of the page. |
| **32** | **Interactive Widget Refreshed Locally, Then Parent Page Refreshed (`slotOverrideCache` Shadow Guard)** | If the user refreshes a widget (`420`) and later triggers a full page refresh after new server data arrives (`421`), the UI displays the newer server data (`421`) while keeping local client state (`localCount=1`). | Stale client-side slot overrides permanently shadow newer server-rendered page data, leaving the user stuck looking at outdated numbers (`420`). |
| **33** | **Zero-Boilerplate Tag-Only Widget (`<DinouCacheSlot tags={["promo"]}>` Without Manual `id`)** | Developers can tag reusable components without inventing unique IDs, and still refresh only those components live from the client without re-running the host page. | **❌ In Next.js (`100% FAIL`):** Updating a tag-addressed component from the browser requires `router.refresh()`, forcing the enclosing dynamic host page to re-execute on the server. |
| **34** | **Global Announcement Banner Update Cascading Through Multi-Level Sub-Layouts (`L1 → L2 → Page`)** | Updating the top-level `L1` layout cascades cleanly through intermediate `L2` layouts so all nested pages show the new banner, without re-executing any nested `L2` widgets or child pages. | Either nested pages continue showing the old `L1` banner on reload, or cascading the layout invalidation forces every nested page and widget in the site to re-render. |
| **35** | **Simultaneous CMS Webhooks Updating Both Navbar (`Layout`) and Article (`Page`) at Once** | Concurrent layout + page revalidations serialize cleanly without corrupting `index.html`, and a user pressing `F5` sees both updates with `0` React hydration errors. | Concurrent writes race on disk—one webhook overwrites the other, or the user's browser crashes with a React Hydration Mismatch on `F5`. |
| **36** | **User Pressing `F5` or Opening a Direct Link After a Layout Update (`Lazy index.html Re-Composition`)** | Pressing `F5` on a co-located or child page serves newly composed HTML combining the fresh layout (`460`/`461`) with the existing cached page (`100`)—`0` hydration errors and `0` page re-executions. | Either the user gets a React Hydration Mismatch error on `F5` (stale `index.html` vs. fresh `layout.rsc`) or the server wastes CPU re-rendering every child page's `page.tsx`. |

---

## 3. Root-Cause Analysis of the 5 Deterministic Next.js 16.4.3 Failures (`13/13` Runs) + ⚠️ 1 Intrinsic Flaky Race Condition (`3/13` Runs)

### 3.0 Synthesis: Two Underlying Architectural Root Causes Explain All 6 Next.js Issues

Rather than being six isolated or accidental bugs, the **5 deterministic failures (`Checks 24, 27, 29, 31, 33`)** and the **1 flaky race condition (`Check 28`)** in Next.js 16.4.3 all trace back to **two fundamental architectural root causes**:

| Root-Cause Cluster | Affected Checks | Underlying Architectural Cause in Next.js 16.4.3 | How Dinou v9.0.3 Solves It by Design |
| :--- | :---: | :--- | :--- |
| **Cluster A — Monolithic Client-to-Server RSC Refresh Protocol (No Sub-Route RSC Endpoints or Client Slot Cache)** | **Checks 24, 27, 31, 33** *(4 of the 5 deterministic failures)* | Even though Next.js 16.4.3 has `"use cache"` for server-side function memoization, **on the network wire and in the client router Next.js still operates on whole routes**. It has no separate `/____rsc_page____` vs. `/____rsc_layout____` endpoints, no `/____rsc_slot____/:id` endpoint, and no client-side `slotOverrideCache`. Consequently:<br>• Calling `router.refresh()` always re-executes the entire route tree from the root layout down (**Check 24**).<br>• Refreshing a cached slot from the browser (by wildcard `*` in **Check 27** or by tag in **Check 33**) requires `updateTag(...)` + `router.refresh()`, which forces uncached dynamic host layouts and pages to re-execute (`999`).<br>• Updating a slot tag for an unmounted route (**Check 31**) purges the entire client Router Cache instead of surgically updating that slot's cached VNode. | Dinou's client router and server protocol are natively segmented in 3D:<br>• `router.refresh()` fetches only `/____rsc_page____` (unless `{ layout: true }` is passed).<br>• `refreshSlot(idOrTag, { fresh })` fetches only `/____rsc_slot____/:id` and updates `<DinouCacheSlotBoundary>` in place without touching host layouts or pages.<br>• `slotOverrideCache` + `knownClientSlots` update unmounted slots in memory without evicting `pageCache`. |
| **Cluster B — Coupled Server Action Re-Rendering & Missing Monotonic Generation Guards Under Concurrency** | **Check 29** *(deterministic)* & **Check 28** *(⚠️ flaky)* | Next.js couples `"use server"` Actions that call `updateTag(...)` directly to an implicit full-route RSC re-render (`generateFlight`) and lacks monotonic Last-Write-Wins (LWW) generation tracking across overlapping slot refreshes:<br>• When a slow (`250 ms`) and a fast (`10 ms`) refresh overlap (**Check 29**), Next.js has no monotonic request/generation ID to discard the late slow response, allowing `401 / stale-slow` to overwrite `402 / fresh-fast`.<br>• When a Server Action calls `updateTag(...)` on a route with `<Suspense>` (**Check 28**), React Flight flushes Chunk #1 immediately (resolving the client `await` early) while the server continues rendering the `<Suspense>` tree in the background, racing with subsequent cold-stampede requests (`got 2`). | Dinou decouples RPC from rendering and enforces strict monotonic concurrency guards:<br>• Server Functions (`POST /____server_fn____`) are pure RPC calls that never trigger hidden background `<Suspense>` page renders (**Check 28**).<br>• Monotonic `latestReqId` (client) and `slotRenderGenerations` + `stampedeKey` (server) guarantee Last-Write-Wins (**Check 29**). |

---

### Failure #1 — Check 24 (`13 Fail of 13 execs` — 100% Deterministic): `router.refresh()` Lacks Horizontal Segmentation on the Client
- **Test:** `rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard`
- **Route:** `/rigorous/hs/refresh-lab?filter=active&buildId=custom_b1&v=custom_v1`
- **Real-World User Impact:** When a user clicks a "Refresh List" button inside a sub-page (e.g., refreshing a table of orders or tickets), **Next.js re-executes every dynamic ancestor layout on the server** (re-running user profile queries, organization permissions, and sidebar counters) instead of refreshing only the page content. In **Dinou v9.0.3**, `router.refresh()` refreshes only the active page (`page.rsc`), keeping parent layouts untouched unless `router.refresh({ layout: true })` is explicitly requested.
- **Observed Error on Next.js 16.4.3 (`13/13` runs):**
  ```text
  router.refresh() (page-only) must NOT re-execute layout (expected 100, got 270)
  ```
- **Architectural Cause:**
  - **Dinou v9.0.3** splits RSC endpoints horizontally into `/____rsc_page____` and `/____rsc_layout____`. Calling `router.refresh()` fetches **only** `/____rsc_page____` (`#hs-refresh-page-seq` updates from `100 → 270` while the dynamic layout `#hs-refresh-layout-seq` remains untouched at `100`). Only when the developer explicitly calls `router.refresh({ layout: true })` does Dinou also re-fetch `/____rsc_layout____` (`#hs-refresh-layout-seq` updates to `270`). Furthermore, Dinou uses internal parameters (`__d_b`, `__d_v`) so user query parameters `?buildId=custom_b1&v=custom_v1` are never clobbered.
  - **Next.js v16.4.3** has a single monolithic `router.refresh()` method on `useRouter()` (`next/navigation`) with no segment scope option. Invoking `router.refresh()` always re-renders the entire active route tree from the root layout down, forcing all dynamic ancestor layouts to re-execute (`#hs-refresh-layout-seq` immediately jumps to `270`).

---

### Failure #2 — Check 27 (`13 Fail of 13 execs` — 100% Deterministic): No Sub-Component Client Slot Refresh (`refreshSlot('*', { fresh: true })` Re-Executes Dynamic Host Layout & Page)
- **Test:** `rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL`
- **Route:** `/rigorous/cache-slot`
- **Real-World User Impact:** On a complex dashboard where a user clicks "Refresh Widgets" (or refreshes a single KPI card), **Next.js cannot fetch just the widget's RSC payload from the browser**—it must run a full-route `router.refresh()`, which re-executes the enclosing dynamic layout and dynamic host page on the server, adding latency and unnecessary database load. In **Dinou v9.0.3**, `refreshSlot` updates only the targeted `<DinouCacheSlot>` boundary in place.
- **Observed Error on Next.js 16.4.3 (`13/13` runs):**
  ```text
  wildcard refreshSlot('*', { fresh: true }) must NOT re-execute host layout or host page (got layout=999, page=999)
  ```
- **Architectural Cause:**
  - **Dinou v9.0.3** provides a dedicated vertical-segmentation client primitive (`refreshSlot(idOrTag, { fresh: true })`, including wildcard `refreshSlot("*", { fresh: true })`) backed by `/____rsc_slot____/:id`. When `refreshSlot("*", { fresh: true })` runs on `/rigorous/cache-slot`, each mounted `<DinouCacheSlotBoundary>` fetches only its own isolated slot RSC stream and reconciles it in place via `React.startTransition`. Neither the enclosing dynamic layout (`csLayoutHostSeq`) nor the enclosing dynamic page (`csDynamicHostSeq`) executes on the server (both stay at `100` even when poisoned to `999`).
  - **Next.js v16.4.3** has `"use cache"` for server-side function/component caching, but **no client-addressable slot boundary or slot RSC endpoint**. Refreshing cached subtrees from the browser requires calling a Server Action with `updateTag(...)` followed by `router.refresh()`. Because `router.refresh()` re-renders the full route hierarchy, both the uncached dynamic host layout and uncached dynamic host page re-execute on the server (`layout=999, page=999`).

---

### Failure #3 — Check 29 (`13 Fail of 13 execs` — 100% Deterministic): Out-of-Order Concurrency Race (No Last-Write-Wins Guard on Slow vs. Fast Slot Refresh)
- **Test:** `rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh)`
- **Route:** `/rigorous/hs-cache-slot`
- **Real-World User Impact:** A classic UI bug in interactive apps: a user clicks a filter or refresh button that triggers a slow backend query (`250 ms`), then immediately changes their mind `50 ms` later and clicks a second option that responds quickly (`10 ms`). In **Next.js**, the user briefly sees the correct second result (`402 / fresh-fast`), and then `190 ms` later the old slow request finishes and **overwrites the screen with stale data (`401 / stale-slow`)**. In **Dinou v9.0.3**, monotonic Last-Write-Wins (LWW) guards on both client and server discard the late response automatically.
- **Observed Error on Next.js 16.4.3 (`13/13` runs):**
  ```text
  LWW race failed in DOM: late slow request (401/stale-slow) overwrote fast request (402/fresh-fast); got seq=401 label=stale-slow
  ```
- **Scenario Timeline:**
  1. **At $t = 0\text{ ms}$:** State is mutated to `{ seq: 401, label: "stale-slow", delayMs: 250 }` and Request #1 is dispatched (`refreshSlot("hscs-page-a-slot", { fresh: true })`). Request #1 captures `{ seq: 401, label: "stale-slow" }` and sleeps for `250 ms` on the server.
  2. **At $t = 50\text{ ms}$:** While Request #1 is still in flight, state is mutated to `{ seq: 402, label: "fresh-fast", delayMs: 10 }` and Request #2 is dispatched.
  3. **At $t \approx 60\text{ ms}$:** Request #2 finishes in `10 ms` and commits `402 / fresh-fast`.
  4. **At $t \approx 250\text{ ms}$:** Request #1 finally finishes `190 ms` after Request #2.
- **Architectural Cause:**
  - **Dinou v9.0.3** enforces **Last-Write-Wins (LWW)** on both ends:
    1. **Client (`dinou/core/slot.js`):** `DinouCacheSlotBoundary` increments a monotonic `latestReqId` per slot; when Request #1 resolves at $t = 250\text{ ms}$, `curEntry.latestReqId !== reqId` discards the stale response so it never overwrites `slotOverrideCache` or the DOM.
    2. **Server (`dinou/core/cache-slot.js`):** `inflightSlotRenders` keys `{ fresh: true }` requests by `stampedeKey` (so Request #2 is not coalesced onto Request #1's stale promise) and tracks a monotonic `slotRenderGenerations` counter per `storageKey`; when Request #1 finishes at $t = 250\text{ ms}$, `isLatestGen()` is `false`, preventing Request #1 from overwriting `slots/hscs-page-a-slot/slot.json` on disk.
  - **Next.js v16.4.3** lacks a monotonic generation guard across concurrent `updateTag("slot:hscs-page-a-slot")` + `"use cache"` executions and concurrent `router.refresh()` transitions. Either Request #2 coalesces onto Request #1's already-running `"use cache"` promise or Request #1's late resolution overwrites the cache/DOM at $t = 250\text{ ms}$, leaving the UI stuck on `401 / stale-slow`.

---

### Failure #4 — Check 31 (`13 Fail of 13 execs` — 100% Deterministic): Unmounted Cross-Route Slot Refresh Purges Client Router Cache Instead of Updating `slotOverrideCache`
- **Test:** `rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back`
- **Routes:** `/rigorous/hs-cache-slot` (Page A) $\leftrightarrow$ `/rigorous/hs-cache-slot/page-b` (Page B)
- **Real-World User Impact:** Suppose a user visits their "Portfolio" tab (Page A), navigates to the "Trade" tab (Page B), executes an action that updates a portfolio summary widget on Page A, and clicks back to "Portfolio" (Page A). In **Dinou v9.0.3**, the widget updates in the background (`slotOverrideCache`) while Page A's route remains in the client `pageCache`, so clicking back to Page A is **instant (`0` page network requests)**. In **Next.js**, invalidating that widget tag wipes out the client Router Cache, forcing a full network re-fetch of Page A when the user navigates back.
- **Observed Error on Next.js 16.4.3 (`13/13` runs):**
  ```text
  expected Page A to be served from client pageCache with 0 page RSC fetches (host=100) + slotOverride=410, got host=100 pageRscReqs=3
  ```
- **Architectural Cause:**
  - **Dinou v9.0.3** decouples the client-side `pageCache` (horizontal route VNodes) from `slotOverrideCache` + `knownClientSlots` (vertical slot VNodes). When the user visits Page A, soft-navigates to Page B (unmounting Page A's `hscs-page-a-slot`), and calls `refreshSlot("hscs-tag-page-a-slot", { fresh: true })` while on Page B:
    1. Dinou resolves `"hscs-tag-page-a-slot"` against `knownClientSlots`, fetches **only** `/____rsc_slot____/hscs-page-a-slot?fresh=1` in the background, and stores the updated VNode (`410`) in `slotOverrideCache` (`T1 → T2 → T3` synchronization in `rigurous-sinergy-hs-cache-slot.md` Scenario 8).
    2. When the user clicks normal `<Link href="/rigorous/hs-cache-slot">` to return to Page A, Dinou serves Page A's VNode directly from the client `pageCache` (**`0` `/____rsc_page____` network requests**) while `<DinouCacheSlotBoundary>` mounts with `slotOverrideCache.get("hscs-page-a-slot")` (`410`).
  - **Next.js v16.4.3** has no client-side `slotOverrideCache` or background slot endpoint. Calling `updateTag("hscs-tag-page-a-slot")` inside a Server Action while on Page B **purges the entire client-side Router Cache**, forcing the subsequent `<Link href="/rigorous/hs-cache-slot">` click to issue full-page RSC network requests instead of serving Page A from client cache.

---

### Failure #5 — Check 33 (`13 Fail of 13 execs` — 100% Deterministic): Tag-Only Slot (`tags={["cs-tag-only"]}`, No `id` Prop) Cannot Refresh Live Without Re-Executing Dynamic Host Page
- **Test:** `rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag`
- **Route:** `/rigorous/cache-slot`
- **Real-World User Impact:** When developers wrap a reusable UI component in a cache boundary using only semantic domain tags (e.g., `tags={["cart-summary"]}`) without hardcoding unique `id` props, **Dinou v9.0.3** still allows refreshing that component live in the browser (`refreshSlot("cart-summary")`) without re-running the dynamic page around it. In **Next.js**, refreshing a tag-addressed component from the client forces the entire dynamic host page to re-execute on the server (`999`).
- **Observed Error on Next.js 16.4.3 (`13/13` runs):**
  ```text
  tag-only refreshSlot must NOT re-execute dynamic host page (expected 100, got 999)
  ```
- **Architectural Cause:**
  - **Dinou v9.0.3** supports tag-only `<DinouCacheSlot tags={["cs-tag-only"]} revalidate={3600}>` without an explicit `id` prop (`rigurous-cache-slot.md` §2.1 & §3.3). Dinou derives a deterministic internal slot identifier from the primary tag (`tag:cs-tag-only#0`), registers the mounted boundary under `"cs-tag-only"` on the client, and allows `refreshSlot("cs-tag-only", { fresh: true })` to refresh only that slot (`430`) via `/____rsc_slot____` while the enclosing `revalidate = 0` dynamic host page stays untouched at `100` (even when poisoned to `999`).
  - **Next.js v16.4.3** requires `updateTag("cs-tag-only")` + `router.refresh()` to update a tag-addressed `"use cache"` component from the client, which re-executes the dynamic host page (`#cs-dynamic-host-seq` becomes `999`).

---

### ⚠️ Intrinsic Flaky Race Condition in Next.js 16.4.3 — Check 28 (`3 Fail of 13 Execs`): Server Action + `<Suspense>` Background Re-Render Leaking Into Cold Stampede Deduplication
- **Test:** `rigorous-cache-slot-stampede: 6 concurrent cold-miss requests coalesce into 1 slot execution`
- **Route:** `/rigorous/cache-slot`
- **Real-World User / Production Impact:** When an admin or webhook triggers a Server Action that invalidates a cached widget on a page with `<Suspense>` streaming, Next.js prematurely resolves the client `await` while secretly continuing to re-render the `<Suspense>` tree in the background on the server. Under concurrent traffic (`6` simultaneous requests), that dangling background render races with subsequent invalidations and requests, causing expensive database/API queries inside `"use cache"` to execute multiple times (`got 2`) instead of coalescing into `1` execution. In **Dinou v9.0.3**, Server Functions are pure RPC calls that never trigger hidden background page renders, guaranteeing `1` execution across `13/13` runs.
- **Observed Behavior Across All 13 Verification Runs on Next.js 16.4.3 (`⚠️ FLAKY — 3 Fail of 13 execs`):**
  - Passed in 10 of the 13 runs (`execCount = 1`), and **failed in 3 of the 13 runs** (1 failure in the 3 initial verification runs + 2 failures on `Run 1/10` and `Run 10/10` in the `--runs=10` stress suite = `3 Fail of 13 execs`, `23.1%` failure rate) with:
    ```text
    expected stampede protection to execute cold 150ms slot exactly once across 6 concurrent requests, got 2
    ```
  - Meanwhile, on **Dinou v9.0.3 (`dinou-9`)**, all 36 checks—including Check 28—passed **`13/13` runs (`468/468` total check executions, `0` failures, `0` flaky checks — 100.0% deterministic)**.
- **Root-Cause Investigation in Next.js 16.4.3 Internals (`revalidate.js`, `action-handler.js`, `use-cache-wrapper.js`):**
  1. **Forced Page Re-Render Inside Server Action `POST`:** When a `"use server"` Server Action invoked from `/rigorous/cache-slot` calls `updateTag(...)` (such as `rigorousResetState()` or `rigorousRevalidateTag("cs-tag-stampede")`), Next.js's `revalidate()` in `next/dist/server/web/spec-extension/revalidate.js` unconditionally sets `store.pathWasRevalidated = ActionDidRevalidateStaticAndDynamic`.
  2. **Automatic RSC Flight Stream on `POST`:** Because `store.pathWasRevalidated` is set, `executeActionAndPrepareForRender()` in `next/dist/server/app-render/action-handler.js` sets `skipPageRendering = false` and immediately starts re-rendering the entire current route (`/rigorous/cache-slot`) as an RSC Flight stream inside the Server Action `POST` response (`generateFlight`).
  3. **Premature Client `await` Resolution Due to `<Suspense>` Streaming:** Because the body of `/rigorous/cache-slot` (`CacheSlotDynamicBody`) is wrapped in `<Suspense>` and awaits `connection()`, React Flight flushes **Chunk #1** of the `POST` response (containing the Server Action's return value `actionResult` and the `<Suspense>` fallback) **immediately**, while on the Node.js server `CacheSlotDynamicBody` and its child `"use cache"` slots (including `<CsStampedeSlotContent />`) are still executing asynchronously in the background.
  4. **The Intrinsic Race Window:** On the client, `await resetState()` resolves as soon as Chunk #1 arrives—making the client code believe the Server Action has completely finished when in fact the server still has a dangling background `<Suspense>` render in flight from that `POST`. In Check 28, the client immediately calls `await mutateState({ csStampedeExecCount: 0, csStampedeDelayMs: 150 })`, followed by `await revalidateTag("cs-tag-stampede")` and 6 concurrent `fetch("/rigorous/cache-slot")` calls. Depending on millisecond-level CPU scheduling, the dangling `<Suspense>` stream from the previous `POST` reaches `<CsStampedeSlotContent />` right *after* `mutateState` sets `csStampedeExecCount = 0` (**Execution #1**) and right *before* `revalidateTag("cs-tag-stampede")` expires the tag again and triggers the coalesced fill for the 6 concurrent `GET` requests (**Execution #2**, yielding `execCount = 2` instead of `1`).
- **Why Dinou v9.0.3 Is 100% Deterministic (`13/13` Runs, `1` Execution in Every Run):**
  - In **Dinou v9.0.3**, Server Functions are pure RPC calls (`POST /____server_fn____`). Calling `resetState()` or `revalidateTag("cs-tag-stampede")` updates the server state/cache and returns a clean JSON response without ever launching an implicit background `<Suspense>` page render behind the developer's back. When `await` resolves in the browser, the Dinou server is 100% idle, and the subsequent 6 concurrent `GET` requests deterministically coalesce in `inflightSlotRenders` into **1** execution every single time.

---

## 4. Deep-Dive Analysis: Why `"use cache"` Warmup Is Only Needed in Next.js 16.4.3 (and Never in Dinou 9.0.3)

While investigating **Check 30** (`rigorous-hs-ppr-ttl & triple-shell-slot`) and **Check 34** (`rigorous-triple-cascade`), we uncovered a fundamental architectural divergence in how **Dinou v9.0.3** and **Next.js v16.4.3** persist and invalidate sub-route caches between `build` and `start`. Specifically, **Next.js 16.4.3 required a dedicated two-phase RAM warmup helper (`warmNextUseCacheBaseline`) inside `resetState()`, whereas Dinou 9.0.3 required zero warmup.**

### 4.1 How Dinou v9.0.3 Works (Granular Disk Persistence at `build` + Eager Revalidation)

When `dinou build` (Process #1) runs, Dinou pre-renders static, ISR, and PPR routes and persists **every 3D segment separately on disk** inside `.dinou/dist2/`:
- **Layouts:** `layout.rsc` and `shell.layout.json`
- **Host Pages:** `page.rsc` and `shell.page.json`
- **Individual `<DinouCacheSlot>` Boundaries:** `slots/<slotId>/slot.json`
- **Composed Route HTML:** `index.html` / `shell.html`

When `dinou build` exits and `dinou start` boots in a brand-new OS process (Process #2):
1. **100% Warm Granular Disk Cache on Boot:** Every layout shell, page shell, and individual `<DinouCacheSlot>` payload already exists on disk at baseline `100`.
2. **Surgical Eager Regeneration Without Host Re-Execution:** If external data changes to `999` on the very first millisecond after `dinou start` boots and `revalidateTag("ts-tag-static-b-slot")` is called (invalidating *only* an inner slot inside a static page), Dinou reads `shell.page.json` from disk (still `100`), re-executes **only** the targeted slot (`slots/ts-static-b-slot/slot.json`), and eagerly splices the new slot payload into `index.html` and `page.rsc` on disk. The static host page (`static-b/page.tsx`) **never** re-executes.
3. **Eager Baseline Restoration Between Tests:** When `resetState()` resets counters to `100` and triggers revalidation in Dinou, Dinou immediately writes the regenerated `100` artifacts to disk before returning.

---

### 4.2 Why Next.js v16.4.3 Required `"use cache"` Warmup (`warmNextUseCacheBaseline`)

In **Next.js v16.4.3** (`cacheComponents: true` / `"use cache"`), caching is split across two disconnected layers:

1. **On Disk (`.next/server/app/` — Unified Whole-Route Files Only):**
   - During `next build` (Process #1), Next.js does **not** persist individual `"use cache"` function outputs as separate files on disk. Instead, it writes a single combined route file (e.g., `static-b.html` / `static-b.rsc`) tagged with the **union of all `cacheTag()` strings** invoked anywhere during that route's render (both the host page tag `"ts-static-b-tag"` and the inner slot tag `"ts-tag-static-b-slot"`).
2. **In RAM (`DefaultCacheHandler` — Ephemeral Per-Process `Map`):**
   - Individual `"use cache"` functions (such as `getTsStaticBHostState()`, `getTsL1ShellState()`, etc.) are stored in Next.js's `DefaultCacheHandler`, which is an **in-memory JavaScript `Map` inside the current Node.js process's RAM** (`next/dist/server/lib/cache-handlers/default.js`).
   - When `next build` (Process #1) terminates, that RAM `Map` is destroyed. When `next start` (Process #2) boots, the `"use cache"` `Map` in RAM starts **completely empty (cold)**.

#### What Happens on `next start` (or After `resetState()`) Without RAM Warmup:
1. **Lazy Eviction:** In Next.js, `updateTag(tag)` is **lazy**—it marks the tag as expired in RAM without re-executing the `"use cache"` function until a future HTTP request renders a route that calls it.
2. **Whole-Route Disk Invalidation on Slot Tag Update:** In **Check 30**, the test poisons the host page counter in memory (`tsStaticBHostSeq = 999`), updates the slot counter (`tsStaticBSlotSeq = 342`), and calls `revalidateTag("ts-tag-static-b-slot")` to verify that invalidating only the slot does not re-execute the Static B host page.
3. **Cold Miss in `DefaultCacheHandler`:** When the browser requests `/rigorous/triple/static-b`:
   - Next.js sees that the on-disk route file `static-b.html` carries `"ts-tag-static-b-slot"` and marks the entire on-disk route file stale.
   - Next.js then re-renders `TripleStaticPageB()`, calling `getTsStaticBHostState()` (host page) and `getTsStaticBSlotState()` (slot).
   - If `getTsStaticBHostState()` is not currently warm in the `next start` process's RAM `Map` (either because `next start` booted cold or because `resetState()` lazily evicted all tags), `getTsStaticBHostState()` suffers a **cold RAM miss**, executes for the first time while `tsStaticBHostSeq` is poisoned at `999`, and leaks `999` into the host page!
4. **Deferred `updateTag` Flush at Server Action Return (`workStore.pendingRevalidatedTags`):**
   - Even subtler: inside a Next.js `"use server"` Action, calling `updateTag(tag)` does **not** flush `CacheHandler.expireTags([tag])` at the line where `updateTag` is called. Next.js queues `tag` in `workStore.pendingRevalidatedTags` and flushes `expireTags` **only after the Server Action function returns**.
   - Therefore, calling `updateTag(tag)` and `warmNextUseCacheBaseline()` inside the **same** Server Action caused the end-of-action `expireTags` flush to immediately evict the entries that `warmNextUseCacheBaseline()` had just populated milliseconds earlier!
   - To make Next.js's in-memory `"use cache"` store warm at baseline `100` before each test, we had to split Next.js's `resetState()` in `rigorous-controls.tsx` into **two sequential Server Action turns**:
     1. `await rigorousResetState()` — resets state to `100`, calls `updateTag(tag)` for all tags, and **returns** so Next.js flushes `expireTags`.
     2. `await rigorousWarmBaseline()` — runs in a **new Server Action turn** after `expireTags` has completed, invoking `warmNextUseCacheBaseline()` so all `"use cache"` entries are stored in RAM with a timestamp strictly newer than the `expireTags` flush.

---

### 4.3 Real-World Production Implications: Dinou 9.0.3 vs. Next.js 16.4.3

| Architectural Dimension | Dinou v9.0.3 | Next.js v16.4.3 (`"use cache"`) |
| :--- | :--- | :--- |
| **Where pre-rendered sub-segments & slots live after `build`** | **On disk** (`.dinou/dist2/slots/<id>/slot.json`, `shell.page.json`, `shell.layout.json`, `layout.rsc`, `page.rsc`). Survives process restarts (`dinou start`). | **In RAM** (`DefaultCacheHandler` `Map`). Disk (`.next/server/app/`) only stores unified whole-route files; the `"use cache"` `Map` starts empty on every `next start`. |
| **Revalidation execution model (`revalidateTag` / `Layout` / `Page`)** | **Eager (immediate):** regenerates and writes only the affected slot or segment to disk immediately, splicing it into cached host shells on disk. | **Lazy (deferred):** only marks tags as expired in RAM (flushed at the end of the Server Action); nothing is regenerated until an HTTP request arrives. |
| **Needs warmup after server restart or tag reset?** | **No (0% warmup):** granular `.json`/`.rsc` shells and slot files are already on disk from `dinou build`. | **Yes:** if you invalidate a single child slot tag after `next start` before the host `"use cache"` function has populated RAM, the whole on-disk route file is invalidated and the host page suffers a cold RAM miss. |
| **Impact on Checks 1 to 30 vs. Checks 1 to 36** | **30/30** and **36/36** with zero warmup. | Improved from **26/30 (4 failures)** to **27/30 (3 failures)** once two-phase RAM warmup resolved Check 30 (and Checks 34 & 36 in the 36-check suite). |

---

### 4.4 Why Not Needing Warmup (Dinou 9.0.3) Is Strictly Superior in Production to Needing Warmup (Next.js 16.4.3)

In this benchmark, we purposefully built `warmNextUseCacheBaseline()` (`apps/next/src/app/rigorous/next-cached-segments.ts`) to give Next.js 16.4.3 the most charitable possible conditions to pass **Check 30** and **Check 34**. Without that custom warmup crutch, Next.js 16.4.3 failed both checks out of the box.

In real-world production deployments, **not needing a warmup phase (Dinou 9.0.3) provides four decisive advantages over requiring RAM warmup (Next.js 16.4.3):**

1. **Zero Cold-Start Penalty After Deploys, Container Restarts, or Auto-Scaling:**
   - **Dinou v9.0.3:** Every time `dinou start` boots (after a rolling deploy, Docker/Kubernetes pod restart, or PM2 reload), all pre-rendered layouts (`shell.layout.json`), pages (`shell.page.json`), and `<DinouCacheSlot>` payloads (`slots/<id>/slot.json`) are already persisted on disk from `dinou build`. Surgical invalidation works from the first millisecond of server uptime.
   - **Next.js v16.4.3:** Every time `next start` boots or a container restarts, `DefaultCacheHandler`'s in-memory `Map` starts completely empty. If a webhook or Server Action invalidates a single small slot tag (`updateTag("my-slot")`) before the parent route has re-executed in RAM, Next.js invalidates the entire on-disk route file and **re-executes the entire parent page/layout and all of its expensive data queries from scratch** (*cold RAM miss*).

2. **Zero Manual Pre-Warming Boilerplate or Maintenance Burden:**
   - In a production application with dozens or hundreds of routes and cached subtrees, developers should not have to maintain a centralized warmup registry that imports and invokes every `"use cache"` function across two sequential Server Action turns on startup or after tag resets. In **Dinou v9.0.3**, granular persistence is automatic at build time with zero userland boilerplate.

3. **First-Visitor Latency Protection (*Eager* Regeneration vs. *Lazy* Eviction):**
   - **Dinou v9.0.3 (*Eager*):** When `revalidateTag`, `revalidatePage`, or `revalidateLayout` is called, Dinou immediately regenerates only the affected piece and splices it into the cached on-disk shells. The very next user who requests the page receives an instant cache hit (`~6–7 ms`).
   - **Next.js v16.4.3 (*Lazy*):** `updateTag` only marks the entry expired in RAM; the first user who visits the page after an invalidation pays the full server re-execution latency on the critical path.

4. **Lower Baseline RAM Pressure:**
   - Because Dinou persists pre-rendered segment shells and slot payloads in `.dinou/dist2/` on disk rather than relying exclusively on an in-memory `Map` to preserve sub-route isolation, Dinou achieves surgical 3D isolation without needing every cached function pre-loaded into RAM at server startup.

---

### 4.5 Deep-Dive on Check 36: Lazy `index.html` Re-Composition & Zero Hydration Mismatch on Co-Located and Descendant Pages After `revalidateLayout`

A critical edge case in Horizontal Segmentation (`rigurous-hs.md` §1.2 & §2.3) occurs when `revalidateLayout(path)` updates an ancestor layout on disk (`layout.rsc` advances from generation $T_1 \to T_2$), and a user subsequently performs a **hard reload (`F5`) or direct URL navigation (`page.goto`)** in the browser (rather than a soft navigation) to:
1. The **co-located page right next to the revalidated layout** (e.g., `/rigorous/hs` next to `rigorous/hs/layout.tsx`, or `/rigorous/hs/nested` next to `rigorous/hs/nested/layout.tsx`).
2. A **direct child page** in a subfolder that shares the revalidated layout (`L1`) and has no layout of its own (e.g., `/rigorous/hs/sibling-a`).
3. A **deep descendant page** under a nested child layout (`L1 → L2`) deeper in the directory tree (e.g., `/rigorous/hs/nested` and `/rigorous/hs/nested/page-2`).

If a framework served the stale pre-rendered `index.html` (from $T_1$) while the client hydrated against the newly revalidated `layout.rsc` (at $T_2$), React would immediately throw a **Hydration Mismatch Error** (`Hydration failed because the server rendered HTML didn't match the client`). Conversely, if a framework eagerly re-rendered every descendant page's `page.tsx` when `revalidateLayout` was called, it would violate Horizontal Segmentation by re-executing untouched pages.

**Check 36 (`rigorous-hs-lazy-html-hydration`)** tests both **Part 1 (`revalidateLayout("/rigorous/hs")` on `L1`, `seq = 460`)** and **Part 2 (`revalidateLayout("/rigorous/hs/nested")` on nested `L2`, `seq = 461`)** while poisoning all co-located and descendant page counters to `999` (`hsIndexPageSeq = 999`, `hsIndexPropsSeq = 999`, `hsSiblingASeq = 999`, `hsNestedPage1Seq = 999`, `hsNestedPage2Seq = 999`):

- **How Dinou v9.0.3 Solves It (Lazy `index.html` Re-Composition from Disk `layout.rsc [T2]` + `page.rsc [T1]`):**
  1. When `revalidateLayout("/rigorous/hs")` runs, Dinou regenerates only `rigorous/hs/layout.rsc` ($T_2$, `seq = 460`). None of the co-located or descendant `page.rsc` payloads (`rigorous/hs/page.rsc`, `sibling-a/page.rsc`, `nested/page.rsc`, `nested/page-2/page.rsc`) are re-executed—they remain on disk at $T_1$ (`seq = 100`).
  2. When a hard `GET` arrives for `/rigorous/hs` (co-located) or `/rigorous/hs/sibling-a` (child), Dinou compares `leafLayout.generatedAt` ($T_2$) against `page.generatedAt` ($T_1$). Detecting $T_2 > T_1$, Dinou **lazily re-composes `index.html`** by streaming the fresh `layout.rsc` ($T_2$, `460`) together with the existing cached `page.rsc` ($T_1$, `100`) and stamping `window.__DINOU_BUILD_ID__ = T2`. Both the raw SSR HTML (`await res.text()`) and the hydrated DOM show `L1 = 460` and `page = 100` with **`0` React hydration errors/warnings** and **`0` executions of `page.tsx`**.
  3. When a hard `GET` arrives for `/rigorous/hs/nested` or `/rigorous/hs/nested/page-2` (under nested layout `L2`), Dinou detects that ancestor `L1.generatedAt` ($T_2$) is newer than `L2.generatedAt` ($T_1$), automatically cascades the layout chain regeneration into `nested/layout.rsc` (while preserving any `<DinouCacheSlot>` inside `L2`, as verified in Check 34, and keeping `nested/page.rsc` and `nested/page-2/page.rsc` untouched at `100`), and lazily re-composes `nested/index.html` and `nested/page-2/index.html` with **`0` hydration errors**.
- **How Next.js v16.4.3 Behaved:**
  - Once `getHsIndexPageState`, `getHsNestedLayoutState`, `getHsNestedPage1State`, and `getHsNestedPage2State` were added to `warmNextUseCacheBaseline()` so their `"use cache"` entries were pre-loaded into RAM before poisoning page counters to `999`, Next.js 16.4.3 also passed Check 36 with `0` hydration errors (because `updateTag("layout:/rigorous/hs")` invalidates the on-disk route HTML files and re-renders the route HTML on the next hard `GET` using the fresh layout + RAM-cached page functions). However, just as in Checks 30 and 34, without RAM warmup in `DefaultCacheHandler`, Next.js suffers a cold RAM miss on unvisited descendant pages and leaks `999`.

---

## 5. Additional Architectural & Ergonomic Differences Observed Across All 36 Checks

| Capability / Mechanism | Dinou v9.0.3 | Next.js v16.4.3 (`cacheComponents: true`) |
| :--- | :--- | :--- |
| **1. Short Clock TTLs (`revalidate = 1s`) in Prerendered Routes** | Works out of the box in `layout_functions.ts`, `page_functions.ts`, and `<DinouCacheSlot revalidate={1}>` inside static or PPR shells without extra wrappers. | **Build-time error** (`Error: Route "...": Next.js encountered uncached or runtime data during prerendering`) whenever a `"use cache"` component has `cacheLife({ expire < 300 })` (`expire: 1`) unless manually wrapped in a `<Suspense>` boundary. |
| **2. Surgical `revalidateLayout(path)` vs. `revalidatePage(path)`** | First-class server primitives in `"dinou/server"`. `revalidateLayout(path)` updates only `layout.rsc` and lazily re-composes child `index.html`/`shell.html` on next `GET`; `revalidatePage(path)` updates only `page.rsc` and reuses cached `layout.rsc`. | `revalidatePath(path, "layout")` and `revalidatePath(path, "page")` in `next/cache` invalidate **both** layout and page caches at `path` (and descendant pages). Achieving surgical layout-only or page-only invalidation in Next.js required manually tagging every layout and page `"use cache"` function with synthetic tags (`layout:${path}`, `page:${path}`) and calling `updateTag(...)`. |
| **3. Client-Side Sub-Component Slot Refresh (`refreshSlot`)** | Built-in `refreshSlot(idOrTag, { fresh })` (including `"*"` wildcard and tag-only slots) fetches `/____rsc_slot____/:id`, updates `slotOverrideCache`, and reconciles only the targeted slot boundary without re-executing host layouts/pages or purging `pageCache`. | No equivalent primitive; requires `updateTag` + `router.refresh()`, which re-executes uncached host layouts/pages and purges the client Router Cache. |
| **4. Parameter Validation (`validateParams`) & Strict Static Lock (`allowISG = false`)** | Declarative exports in `page_functions.ts` / `layout_functions.ts`: `validateParams(params)` and `export const allowISG = false`. | `dynamicParams = false` is ignored or incompatible with `cacheComponents: true` in Next.js 16.4.3 when combined with dynamic/cached subtrees; requires imperative `notFound()` guards inside every page/layout component body. |
| **5. Layout Hierarchy Escape Hatches (`reset_layout` & `no_layout`)** | Zero-move file markers: drop an empty `reset_layout` or `no_layout` file in any route folder without restructuring parent directories. | No file-marker equivalent; requires refactoring the directory tree into parenthesized Route Groups (`(with-l1)/`, `(reset-branch)/`, `(no-layout)/`) so sibling branches stop inheriting the parent `layout.tsx`. |
