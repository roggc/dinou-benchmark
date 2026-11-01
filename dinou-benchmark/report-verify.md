# Rigorous 3D Caching & Streaming Verification Report: Dinou v9.0.3 vs. Next.js v16.4.3

**Date:** November 1, 2026  
**Benchmark Repository:** `dinou-benchmark` (`dev` branch)  
**Frameworks Compared:**
- **Dinou v9.0.3** (`apps/dinou-9` vendorized & `apps/dinou-9-u` unvendorized) — React 19 RSC framework
- **Next.js v16.4.3** (`apps/next` with `cacheComponents: true` / `"use cache"` / PPR enabled) — React 19 App Router

---

## 1. Executive Summary

To evaluate both frameworks beyond synthetic happy-path benchmarks, we implemented the complete **3D Caching & Streaming Matrix** defined across the eight `rigurous-*.md` reference specifications (`rigurous-hs.md`, `rigurous-cache-slot.md`, `rigurous-ppr.md`, `rigurous-sinergy.md`, `rigurous-sinergy-hs-cache-slot.md`, `rigurous-sinergy-hs-ppr.md`, `rigurous-triple-sinergy.md`, and `rigurous-revalidation-scenarios.md`) and expanded `scripts/verify.mjs` from **13 baseline checks** to **35 end-to-end Playwright & HTTP verification checks**.

The 35 checks test three orthogonal caching axes—**Horizontal Segmentation (Layouts vs. Pages)**, **Vertical Segmentation (`<DinouCacheSlot>` / `"use cache"` Micro-ISR)**, and **Partial Prerendering (PPR)**—individually, in all three pairwise combinations, and in full **Triple Synergy**, under both **Clock-Based TTL Expiration (`revalidate = 1s`)** and **On-Demand Surgical Revalidation (`revalidatePage`, `revalidateLayout`, `revalidatePath`, `revalidateTag`, `refreshSlot`)**, including concurrency stampedes, out-of-order race conditions, unmounted cross-route slot refreshes, `slotOverrideCache` shadowing guards, tag-only slot boundaries, multi-level ancestor layout cascades, and simultaneous revalidation queues.

### Final Verification Scoreboard (35 Checks)

| Framework | Version | Baseline Checks (1–13) | Core 3D Rigorous Suites (14–22) | Deep Stress & Concurrency Edge Cases (23–35) | Total Passed | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dinou 9.0.3** (`apps/dinou-9`) | `9.0.3` | 13 / 13 | 9 / 9 | 13 / 13 | **35 / 35** | **PASS (100%)** |
| **Dinou 9.0.3 (`-u`)** (`apps/dinou-9-u`) | `9.0.3` | 13 / 13 | 9 / 9 | 13 / 13 | **35 / 35** | **PASS (100%)** |
| **Next.js 16.4.3** (`apps/next`) | `16.4.3` | 13 / 13 | 9 / 9 | 8 / 13 | **30 / 35** | **FAIL (5 failures)** |

---

## 2. Complete 35-Check Verification Matrix

| # | Check Name in `scripts/verify.mjs` | Dimension / Suite | Dinou 9.0.3 | Dinou 9.0.3 (`-u`) | Next.js 16.4.3 |
| :-: | :--- | :--- | :---: | :---: | :---: |
| 1 | `ssg: / responds 200` | Baseline SSG | PASS (7.2 ms) | PASS (7.7 ms) | PASS (14.0 ms) |
| 2 | `ssg: / 50 items listing` | Baseline SSG | PASS | PASS | PASS |
| 3 | `ssg: stable HTML across requests` | Baseline SSG | PASS | PASS | PASS |
| 4 | `isr: /items/1 responds 200` | Baseline ISR | PASS (7.3 ms) | PASS (6.5 ms) | PASS (58.8 ms) |
| 5 | `isr: cached and stable HTML` | Baseline ISR | PASS | PASS | PASS |
| 6 | `isr: prerendered route /items/42` | Baseline ISR | PASS | PASS | PASS |
| 7 | `404: nonexistent & validateParams/allowISG routes` | Baseline + HS Guards | PASS | PASS | PASS |
| 8 | `dashboard: responds 200` | Baseline Dynamic SSR | PASS (237.1 ms) | PASS (239.2 ms) | PASS (234.5 ms) |
| 9 | `dashboard: is dynamic (two requests differ)` | Baseline Dynamic SSR | PASS | PASS | PASS |
| 10 | `dashboard: streams 3 holes after fallback` | Baseline Streaming | PASS | PASS | PASS |
| 11 | `ppr: static shell in first chunk` | Baseline PPR | PASS (6.08 ms) | PASS (5.34 ms) | PASS (8.89 ms) |
| 12 | `ppr: hole arrives later (streaming)` | Baseline PPR | PASS (5.00 ms shell) | PASS (3.98 ms shell) | PASS (2.40 ms shell) |
| 13 | `mutation: Server Function visible in browser` | Baseline Server Actions | PASS | PASS | PASS |
| 14 | `rigorous-hs: sibling soft nav preserves layout client state & mountId` | Suite 1 · HS | PASS (`layoutFetches=0`) | PASS (`layoutFetches=0`) | PASS (`layoutFetches=0`) |
| 15 | `rigorous-hs: nested L2 layout, @badge slot, dynamic [deptId], locked [code] & escape hatches` | Suite 1 · HS | PASS | PASS | PASS |
| 16 | `rigorous-hs: surgical revalidatePage vs revalidateLayout & lazy HTML re-composition` | Suite 1 · HS | PASS (`0` hydr. errors) | PASS (`0` hydr. errors) | PASS (`0` hydr. errors) |
| 17 | `rigorous-cache-slot: dynamic bypass, surgical slot refresh, shared tag, nested slots & server action prop` | Suite 2 · Cache-Slot | PASS | PASS | PASS |
| 18 | `rigorous-ppr: static shell, collapsed static Suspense, concurrent holes, inherited/opt-out & XSS guard` | Suite 3 · PPR | PASS (`XSS safe`) | PASS (`XSS safe`) | PASS (`XSS safe`) |
| 19 | `rigorous-ppr-cache-slot: shell slots vs dynamic hole slots & nested hole slot isolation` | Suite 4 · PPR + Slot | PASS | PASS | PASS |
| 20 | `rigorous-hs-cache-slot: cross-axis shared tag, round-trip A->B->A slot persistence & LWW race` | Suite 5 · HS + Slot | PASS | PASS | PASS |
| 21 | `rigorous-hs-ppr: L1 PPR layout + @sidebar hole + PPR pages + surgical revalidateLayout/Page` | Suite 6 · HS + PPR | PASS | PASS | PASS |
| 22 | `rigorous-triple: 3D matrix surgical isolation (HS + Cache-Slot + PPR + 1s clock TTL)` | Suite 7 · Triple Synergy | PASS (`0` hydr. errors) | PASS (`0` hydr. errors) | PASS (`0` hydr. errors) |
| 23 | `rigorous-hs: client pageCache deduplication vs <Link fresh> bypass` | Deep Stress #1 · HS | PASS (`0` reqs on cached) | PASS (`0` reqs on cached) | PASS (`0` reqs on cached) |
| 24 | `rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard` | Deep Stress #2 · HS | **PASS** (`layout=100, page=270`) | **PASS** (`layout=100, page=270`) | **FAIL** (`layout=270`) |
| 25 | `rigorous-hs: page error.tsx containment inside outlet & soft-nav recovery` | Deep Stress #3 · HS | PASS | PASS | PASS |
| 26 | `rigorous-hs-ttl: clock-based 1s Layout TTL vs 1s Page TTL surgical expiration` | Deep Stress #4 · HS TTL | PASS (`280/100`, `281/100`) | PASS (`280/100`, `281/100`) | PASS (`280/100`, `281/100`) |
| 27 | `rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL` | Deep Stress #5 · Slot | **PASS** (`hosts=100`) | **PASS** (`hosts=100`) | **FAIL** (`hosts=999`) |
| 28 | `rigorous-cache-slot-stampede: 6 concurrent cold-miss requests coalesce into 1 slot execution` | Deep Stress #6 · Stampede | PASS (`1` execution) | PASS (`1` execution) | PASS (`1` execution) |
| 29 | `rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh)` | Deep Stress #7 · LWW Race | **PASS** (`402/fresh-fast`) | **PASS** (`402/fresh-fast`) | **FAIL** (`401/stale-slow`) |
| 30 | `rigorous-hs-ppr-ttl & triple-shell-slot: 1s PPR clock TTLs + surgical static-shell slot revalidateTag` | Deep Stress #8 · Triple + TTL | PASS (`330/331`, `340/341/342`) | PASS (`330/331`, `340/341/342`) | PASS (`330/331`, `340/341/342`) |
| 31 | `rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back` | Deep Stress #9 · HS + Slot | **PASS** (`0` page RSC reqs) | **PASS** (`0` page RSC reqs) | **FAIL** (`pageRscReqs=1`) |
| 32 | `rigorous-hs-cache-slot-shadow-guard: slotOverrideCache yields to newer server children on router.refresh()` | Deep Stress #10 · HS + Slot | PASS (`420 → 421`, state=1) | PASS (`420 → 421`, state=1) | PASS (`420 → 421`, state=1) |
| 33 | `rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag` | Deep Stress #11 · Slot | **PASS** (`host=100, slot=430`) | **PASS** (`host=100, slot=430`) | **FAIL** (`host=999`) |
| 34 | `rigorous-triple-cascade: ancestor L1 revalidateLayout cascades through L2 to nested PPR & static children` | Deep Stress #12 · Triple Cascade | PASS (`L1=440`, children=`100`) | PASS (`L1=440`, children=`100`) | PASS (`L1=440`, children=`100`) |
| 35 | `rigorous-hs-concurrent-reval: simultaneous revalidateLayout + revalidatePage serialization & F5 hydration` | Deep Stress #13 · Concurrency | PASS (`450/451`, `0` hydr. err) | PASS (`450/451`, `0` hydr. err) | PASS (`450/451`, `0` hydr. err) |

---

## 3. Root-Cause Analysis of the 5 Next.js 16.4.3 Failures

### Failure #1 — Check 24: `router.refresh()` Lacks Horizontal Segmentation on the Client
- **Test:** `rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard`
- **Route:** `/rigorous/hs/refresh-lab?filter=active&buildId=custom_b1&v=custom_v1`
- **Observed Error on Next.js 16.4.3:**
  ```text
  router.refresh() (page-only) must NOT re-execute layout (expected 100, got 270)
  ```
- **Architectural Cause:**
  - **Dinou v9.0.3** splits RSC endpoints horizontally into `/____rsc_page____` and `/____rsc_layout____`. Calling `router.refresh()` fetches **only** `/____rsc_page____` (`#hs-refresh-page-seq` updates from `100 → 270` while the dynamic layout `#hs-refresh-layout-seq` remains untouched at `100`). Only when the developer explicitly calls `router.refresh({ layout: true })` does Dinou also re-fetch `/____rsc_layout____` (`#hs-refresh-layout-seq` updates to `270`). Furthermore, Dinou uses internal parameters (`__d_b`, `__d_v`) so user query parameters `?buildId=custom_b1&v=custom_v1` are never clobbered.
  - **Next.js v16.4.3** has a single monolithic `router.refresh()` method on `useRouter()` (`next/navigation`) with no segment scope option. Invoking `router.refresh()` always re-renders the entire active route tree from the root layout down, forcing all dynamic ancestor layouts to re-execute (`#hs-refresh-layout-seq` immediately jumps to `270`).

---

### Failure #2 — Check 27: No Sub-Component Client Slot Refresh (`refreshSlot('*', { fresh: true })` Re-Executes Dynamic Host Layout & Page)
- **Test:** `rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL`
- **Route:** `/rigorous/cache-slot`
- **Observed Error on Next.js 16.4.3:**
  ```text
  wildcard refreshSlot('*', { fresh: true }) must NOT re-execute host layout or host page (got layout=999, page=999)
  ```
- **Architectural Cause:**
  - **Dinou v9.0.3** provides a dedicated vertical-segmentation client primitive (`refreshSlot(idOrTag, { fresh: true })`, including wildcard `refreshSlot("*", { fresh: true })`) backed by `/____rsc_slot____/:id`. When `refreshSlot("*", { fresh: true })` runs on `/rigorous/cache-slot`, each mounted `<DinouCacheSlotBoundary>` fetches only its own isolated slot RSC stream and reconciles it in place via `React.startTransition`. Neither the enclosing dynamic layout (`csLayoutHostSeq`) nor the enclosing dynamic page (`csDynamicHostSeq`) executes on the server (both stay at `100` even when poisoned to `999`).
  - **Next.js v16.4.3** has `"use cache"` for server-side function/component caching, but **no client-addressable slot boundary or slot RSC endpoint**. Refreshing cached subtrees from the browser requires calling a Server Action with `updateTag(...)` followed by `router.refresh()`. Because `router.refresh()` re-renders the full route hierarchy, both the uncached dynamic host layout and uncached dynamic host page re-execute on the server (`layout=999, page=999`).

---

### Failure #3 — Check 29: Out-of-Order Concurrency Race (No Last-Write-Wins Guard on Slow vs. Fast Slot Refresh)
- **Test:** `rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh)`
- **Route:** `/rigorous/hs-cache-slot`
- **Observed Error on Next.js 16.4.3:**
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

### Failure #4 — Check 31: Unmounted Cross-Route Slot Refresh Purges Client Router Cache Instead of Updating `slotOverrideCache`
- **Test:** `rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back`
- **Routes:** `/rigorous/hs-cache-slot` (Page A) $\leftrightarrow$ `/rigorous/hs-cache-slot/page-b` (Page B)
- **Observed Error on Next.js 16.4.3:**
  ```text
  expected Page A to be served from client pageCache with 0 page RSC fetches (host=100) + slotOverride=410, got host=100 pageRscReqs=1
  ```
- **Architectural Cause:**
  - **Dinou v9.0.3** decouples the client-side `pageCache` (horizontal route VNodes) from `slotOverrideCache` + `knownClientSlots` (vertical slot VNodes). When the user visits Page A, soft-navigates to Page B (unmounting Page A's `hscs-page-a-slot`), and calls `refreshSlot("hscs-tag-page-a-slot", { fresh: true })` while on Page B:
    1. Dinou resolves `"hscs-tag-page-a-slot"` against `knownClientSlots`, fetches **only** `/____rsc_slot____/hscs-page-a-slot?fresh=1` in the background, and stores the updated VNode (`410`) in `slotOverrideCache` (`T1 → T2 → T3` synchronization in `rigurous-sinergy-hs-cache-slot.md` Scenario 8).
    2. When the user clicks normal `<Link href="/rigorous/hs-cache-slot">` to return to Page A, Dinou serves Page A's VNode directly from the client `pageCache` (**`0` `/____rsc_page____` network requests**) while `<DinouCacheSlotBoundary>` mounts with `slotOverrideCache.get("hscs-page-a-slot")` (`410`).
  - **Next.js v16.4.3** has no client-side `slotOverrideCache` or background slot endpoint. Calling `updateTag("hscs-tag-page-a-slot")` inside a Server Action while on Page B **purges the entire client-side Router Cache**, forcing the subsequent `<Link href="/rigorous/hs-cache-slot">` click to issue a full-page RSC network request (`pageRscReqs=1`) instead of serving Page A from client cache.

---

### Failure #5 — Check 33: Tag-Only Slot (`tags={["cs-tag-only"]}`, No `id` Prop) Cannot Refresh Live Without Re-Executing Dynamic Host Page
- **Test:** `rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag`
- **Route:** `/rigorous/cache-slot`
- **Observed Error on Next.js 16.4.3:**
  ```text
  tag-only refreshSlot must NOT re-execute dynamic host page (expected 100, got 999)
  ```
- **Architectural Cause:**
  - **Dinou v9.0.3** supports tag-only `<DinouCacheSlot tags={["cs-tag-only"]} revalidate={3600}>` without an explicit `id` prop (`rigurous-cache-slot.md` §2.1 & §3.3). Dinou derives a deterministic internal slot identifier from the primary tag (`tag:cs-tag-only#0`), registers the mounted boundary under `"cs-tag-only"` on the client, and allows `refreshSlot("cs-tag-only", { fresh: true })` to refresh only that slot (`430`) via `/____rsc_slot____` while the enclosing `revalidate = 0` dynamic host page stays untouched at `100` (even when poisoned to `999`).
  - **Next.js v16.4.3** requires `updateTag("cs-tag-only")` + `router.refresh()` to update a tag-addressed `"use cache"` component from the client, which re-executes the dynamic host page (`#cs-dynamic-host-seq` becomes `999`).

---

## 4. Deep-Dive Discovery: Next.js 16.4.3 Server Action `updateTag` Flush Timing & Ephemeral `"use cache"` Store

While investigating **Check 30** (`rigorous-hs-ppr-ttl & triple-shell-slot`) and **Check 34** (`rigorous-triple-cascade`), we uncovered two subtle internal behaviors of Next.js 16.4.3 (`cacheComponents: true`):

1. **Deferred `updateTag` Flush at Server Action Return (`workStore.pendingRevalidatedTags`):**
   - In Next.js 16.4.3, calling `updateTag(tag)` inside a `"use server"` Action does **not** synchronously call `CacheHandler.expireTags([tag])` at the call site. Instead, it appends `tag` to `workStore.pendingRevalidatedTags`, which Next.js flushes to `CacheHandler.expireTags` **only after the Server Action function returns**.
   - Consequently, if a Server Action calls `updateTag(tag)` and then calls a `"use cache"` function within the **same** Server Action turn to pre-warm the cache, the warmed cache entry receives a timestamp *earlier* than the end-of-action `expireTags` flush and is **immediately evicted as soon as the Server Action returns**.
   - Once we separated Next.js's test baseline reset into two sequential Server Action turns (`await rigorousResetState()` to flush `updateTag`, followed by `await rigorousWarmBaseline()` in a subsequent turn), Next.js 16.4.3 passed both **Check 30** and **Check 34**.

2. **Ephemeral In-Memory `DefaultCacheHandler` vs. Dinou's Persistent `.dinou/dist2` Store:**
   - **Dinou v9.0.3** persists both host shells (`shell.page.json`, `shell.layout.json`) and individual `<DinouCacheSlot>` payloads (`slots/<id>/slot.json`) to disk during `dinou build`. When `dinou start` boots in a new OS process, all layout, page, and slot caches are immediately warm on disk.
   - **Next.js v16.4.3** persists only whole-route HTML/RSC files to `.next/server/app/` during `next build`. Individual `"use cache"` function entries use `DefaultCacheHandler` (an in-memory `Map`) that starts cold when `next start` boots in a new process.

---

## 5. Additional Architectural & Ergonomic Differences Observed Across All 35 Checks

| Capability / Mechanism | Dinou v9.0.3 | Next.js v16.4.3 (`cacheComponents: true`) |
| :--- | :--- | :--- |
| **1. Short Clock TTLs (`revalidate = 1s`) in Prerendered Routes** | Works out of the box in `layout_functions.ts`, `page_functions.ts`, and `<DinouCacheSlot revalidate={1}>` inside static or PPR shells without extra wrappers. | **Build-time error** (`Error: Route "...": Next.js encountered uncached or runtime data during prerendering`) whenever a `"use cache"` component has `cacheLife({ expire < 300 })` (`expire: 1`) unless manually wrapped in a `<Suspense>` boundary. |
| **2. Surgical `revalidateLayout(path)` vs. `revalidatePage(path)`** | First-class server primitives in `"dinou/server"`. `revalidateLayout(path)` updates only `layout.rsc` and lazily re-composes child `index.html`/`shell.html` on next `GET`; `revalidatePage(path)` updates only `page.rsc` and reuses cached `layout.rsc`. | `revalidatePath(path, "layout")` and `revalidatePath(path, "page")` in `next/cache` invalidate **both** layout and page caches at `path` (and descendant pages). Achieving surgical layout-only or page-only invalidation in Next.js required manually tagging every layout and page `"use cache"` function with synthetic tags (`layout:${path}`, `page:${path}`) and calling `updateTag(...)`. |
| **3. Client-Side Sub-Component Slot Refresh (`refreshSlot`)** | Built-in `refreshSlot(idOrTag, { fresh })` (including `"*"` wildcard and tag-only slots) fetches `/____rsc_slot____/:id`, updates `slotOverrideCache`, and reconciles only the targeted slot boundary without re-executing host layouts/pages or purging `pageCache`. | No equivalent primitive; requires `updateTag` + `router.refresh()`, which re-executes uncached host layouts/pages and purges the client Router Cache. |
| **4. Parameter Validation (`validateParams`) & Strict Static Lock (`allowISG = false`)** | Declarative exports in `page_functions.ts` / `layout_functions.ts`: `validateParams(params)` and `export const allowISG = false`. | `dynamicParams = false` is ignored or incompatible with `cacheComponents: true` in Next.js 16.4.3 when combined with dynamic/cached subtrees; requires imperative `notFound()` guards inside every page/layout component body. |
| **5. Layout Hierarchy Escape Hatches (`reset_layout` & `no_layout`)** | Zero-move file markers: drop an empty `reset_layout` or `no_layout` file in any route folder without restructuring parent directories. | No file-marker equivalent; requires refactoring the directory tree into parenthesized Route Groups (`(with-l1)/`, `(reset-branch)/`, `(no-layout)/`) so sibling branches stop inheriting the parent `layout.tsx`. |
