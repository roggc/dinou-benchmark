# Rigorous 3D Caching & Streaming Verification Report: Dinou v9.0.3 vs. Next.js v16.4.3

**Date:** November 1, 2026  
**Benchmark Repository:** `dinou-benchmark` (`dev` branch)  
**Frameworks Compared:**
- **Dinou v9.0.3** (`apps/dinou-9` vendorized & `apps/dinou-9-u` unvendorized) — React 19 RSC framework
- **Next.js v16.4.3** (`apps/next` with `cacheComponents: true` / `"use cache"` / PPR enabled) — React 19 App Router

---

## 1. Executive Summary

To evaluate both frameworks beyond synthetic happy-path benchmarks, we implemented the complete **3D Caching & Streaming Matrix** defined across the eight `rigurous-*.md` reference specifications (`rigurous-hs.md`, `rigurous-cache-slot.md`, `rigurous-ppr.md`, `rigurous-sinergy.md`, `rigurous-sinergy-hs-cache-slot.md`, `rigurous-sinergy-hs-ppr.md`, `rigurous-triple-sinergy.md`, and `rigurous-revalidation-scenarios.md`) and expanded `scripts/verify.mjs` from **13 baseline checks** to **36 end-to-end Playwright & HTTP verification checks**.

The 36 checks test three orthogonal caching axes—**Horizontal Segmentation (Layouts vs. Pages)**, **Vertical Segmentation (`<DinouCacheSlot>` / `"use cache"` Micro-ISR)**, and **Partial Prerendering (PPR)**—individually, in all three pairwise combinations, and in full **Triple Synergy**, under both **Clock-Based TTL Expiration (`revalidate = 1s`)** and **On-Demand Surgical Revalidation (`revalidatePage`, `revalidateLayout`, `revalidatePath`, `revalidateTag`, `refreshSlot`)**, including concurrency stampedes, out-of-order race conditions, unmounted cross-route slot refreshes, `slotOverrideCache` shadowing guards, tag-only slot boundaries, multi-level ancestor layout cascades, simultaneous revalidation queues, and lazy `index.html` re-composition with zero hydration mismatch on hard navigation across co-located and descendant pages.

### Final Verification Scoreboard (36 Checks)

| Framework | Version | Baseline Checks (1–13) | Core 3D Rigorous Suites (14–22) | Deep Stress & Concurrency Edge Cases (23–36) | Total Passed | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dinou 9.0.3** (`apps/dinou-9`) | `9.0.3` | 13 / 13 | 9 / 9 | 14 / 14 | **36 / 36** | **✅ PASS (100% deterministic)** |
| **Dinou 9.0.3 (`-u`)** (`apps/dinou-9-u`) | `9.0.3` | 13 / 13 | 9 / 9 | 14 / 14 | **36 / 36** | **✅ PASS (100% deterministic)** |
| **Next.js 16.4.3** (`apps/next`) | `16.4.3` | 13 / 13 | 9 / 9 | 9 / 14 *(8 / 14 on race)* | **31 / 36** *(30 / 36)* | **❌ FAIL (5 failures + ⚠️ 1 flaky: 1 Fail of 3 execs)** |

---

## 2. Complete 36-Check Verification Matrix

| # | Check Name in `scripts/verify.mjs` | Dimension / Suite | Dinou 9.0.3 | Dinou 9.0.3 (`-u`) | Next.js 16.4.3 |
| :-: | :--- | :--- | :---: | :---: | :---: |
| 1 | `ssg: / responds 200` | Baseline SSG | ✅ PASS (5.3 ms) | ✅ PASS (8.0 ms) | ✅ PASS (11.6 ms) |
| 2 | `ssg: / 50 items listing` | Baseline SSG | ✅ PASS | ✅ PASS | ✅ PASS |
| 3 | `ssg: stable HTML across requests` | Baseline SSG | ✅ PASS | ✅ PASS | ✅ PASS |
| 4 | `isr: /items/1 responds 200` | Baseline ISR | ✅ PASS (8.2 ms) | ✅ PASS (6.4 ms) | ✅ PASS (20.8 ms) |
| 5 | `isr: cached and stable HTML` | Baseline ISR | ✅ PASS | ✅ PASS | ✅ PASS |
| 6 | `isr: prerendered route /items/42` | Baseline ISR | ✅ PASS | ✅ PASS | ✅ PASS |
| 7 | `404: nonexistent & validateParams/allowISG routes` | Baseline + HS Guards | ✅ PASS | ✅ PASS | ✅ PASS |
| 8 | `dashboard: responds 200` | Baseline Dynamic SSR | ✅ PASS (234.8 ms) | ✅ PASS (217.7 ms) | ✅ PASS (267.2 ms) |
| 9 | `dashboard: is dynamic (two requests differ)` | Baseline Dynamic SSR | ✅ PASS | ✅ PASS | ✅ PASS |
| 10 | `dashboard: streams 3 holes after fallback` | Baseline Streaming | ✅ PASS | ✅ PASS | ✅ PASS |
| 11 | `ppr: static shell in first chunk` | Baseline PPR | ✅ PASS (7.83 ms) | ✅ PASS (5.43 ms) | ✅ PASS (26.89 ms) |
| 12 | `ppr: hole arrives later (streaming)` | Baseline PPR | ✅ PASS (4.77 ms shell) | ✅ PASS (6.57 ms shell) | ✅ PASS (3.17 ms shell) |
| 13 | `mutation: Server Function visible in browser` | Baseline Server Actions | ✅ PASS | ✅ PASS | ✅ PASS |
| 14 | `rigorous-hs: sibling soft nav preserves layout client state & mountId` | Suite 1 · HS | ✅ PASS (`layoutFetches=0`) | ✅ PASS (`layoutFetches=0`) | ✅ PASS (`layoutFetches=0`) |
| 15 | `rigorous-hs: nested L2 layout, @badge slot, dynamic [deptId], locked [code] & escape hatches` | Suite 1 · HS | ✅ PASS | ✅ PASS | ✅ PASS |
| 16 | `rigorous-hs: surgical revalidatePage vs revalidateLayout & lazy HTML re-composition` | Suite 1 · HS | ✅ PASS (`0` hydr. errors) | ✅ PASS (`0` hydr. errors) | ✅ PASS (`0` hydr. errors) |
| 17 | `rigorous-cache-slot: dynamic bypass, surgical slot refresh, shared tag, nested slots & server action prop` | Suite 2 · Cache-Slot | ✅ PASS | ✅ PASS | ✅ PASS |
| 18 | `rigorous-ppr: static shell, collapsed static Suspense, concurrent holes, inherited/opt-out & XSS guard` | Suite 3 · PPR | ✅ PASS (`XSS safe`) | ✅ PASS (`XSS safe`) | ✅ PASS (`XSS safe`) |
| 19 | `rigorous-ppr-cache-slot: shell slots vs dynamic hole slots & nested hole slot isolation` | Suite 4 · PPR + Slot | ✅ PASS | ✅ PASS | ✅ PASS |
| 20 | `rigorous-hs-cache-slot: cross-axis shared tag, round-trip A->B->A slot persistence & LWW race` | Suite 5 · HS + Slot | ✅ PASS | ✅ PASS | ✅ PASS |
| 21 | `rigorous-hs-ppr: L1 PPR layout + @sidebar hole + PPR pages + surgical revalidateLayout/Page` | Suite 6 · HS + PPR | ✅ PASS | ✅ PASS | ✅ PASS |
| 22 | `rigorous-triple: 3D matrix surgical isolation (HS + Cache-Slot + PPR + 1s clock TTL)` | Suite 7 · Triple Synergy | ✅ PASS (`0` hydr. errors) | ✅ PASS (`0` hydr. errors) | ✅ PASS (`0` hydr. errors) |
| 23 | `rigorous-hs: client pageCache deduplication vs <Link fresh> bypass` | Deep Stress #1 · HS | ✅ PASS (`0` reqs on cached) | ✅ PASS (`0` reqs on cached) | ✅ PASS (`0` reqs on cached) |
| 24 | `rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard` | Deep Stress #2 · HS | **✅ PASS** (`layout=100, page=270`) | **✅ PASS** (`layout=100, page=270`) | **❌ FAIL** (`layout=270`) |
| 25 | `rigorous-hs: page error.tsx containment inside outlet & soft-nav recovery` | Deep Stress #3 · HS | ✅ PASS | ✅ PASS | ✅ PASS |
| 26 | `rigorous-hs-ttl: clock-based 1s Layout TTL vs 1s Page TTL surgical expiration` | Deep Stress #4 · HS TTL | ✅ PASS (`280/100`, `281/100`) | ✅ PASS (`280/100`, `281/100`) | ✅ PASS (`280/100`, `281/100`) |
| 27 | `rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL` | Deep Stress #5 · Slot | **✅ PASS** (`hosts=100`) | **✅ PASS** (`hosts=100`) | **❌ FAIL** (`hosts=999`) |
| 28 | `rigorous-cache-slot-stampede: 6 concurrent cold-miss requests coalesce into 1 slot execution` | Deep Stress #6 · Stampede | **✅ PASS** (`1` exec, deterministic) | **✅ PASS** (`1` exec, deterministic) | **⚠️ FLAKY** (1 Fail of 3 execs) |
| 29 | `rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh)` | Deep Stress #7 · LWW Race | **✅ PASS** (`402/fresh-fast`) | **✅ PASS** (`402/fresh-fast`) | **❌ FAIL** (`401/stale-slow`) |
| 30 | `rigorous-hs-ppr-ttl & triple-shell-slot: 1s PPR clock TTLs + surgical static-shell slot revalidateTag` | Deep Stress #8 · Triple + TTL | ✅ PASS (`330/331`, `340/341/342`) | ✅ PASS (`330/331`, `340/341/342`) | ✅ PASS (`330/331`, `340/341/342`) |
| 31 | `rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back` | Deep Stress #9 · HS + Slot | **✅ PASS** (`0` page RSC reqs) | **✅ PASS** (`0` page RSC reqs) | **❌ FAIL** (`pageRscReqs=3`) |
| 32 | `rigorous-hs-cache-slot-shadow-guard: slotOverrideCache yields to newer server children on router.refresh()` | Deep Stress #10 · HS + Slot | ✅ PASS (`420 → 421`, state=1) | ✅ PASS (`420 → 421`, state=1) | ✅ PASS (`420 → 421`, state=1) |
| 33 | `rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag` | Deep Stress #11 · Slot | **✅ PASS** (`host=100, slot=430`) | **✅ PASS** (`host=100, slot=430`) | **❌ FAIL** (`host=999`) |
| 34 | `rigorous-triple-cascade: ancestor L1 revalidateLayout cascades through L2 to nested PPR & static children` | Deep Stress #12 · Triple Cascade | ✅ PASS (`L1=440`, children=`100`) | ✅ PASS (`L1=440`, children=`100`) | ✅ PASS (`L1=440`, children=`100`) |
| 35 | `rigorous-hs-concurrent-reval: simultaneous revalidateLayout + revalidatePage serialization & F5 hydration` | Deep Stress #13 · Concurrency | ✅ PASS (`450/451`, `0` hydr. err) | ✅ PASS (`450/451`, `0` hydr. err) | ✅ PASS (`450/451`, `0` hydr. err) |
| 36 | `rigorous-hs-lazy-html-hydration: revalidateLayout lazy index.html recomposition & 0 hydration errors on co-located & child pages (hard nav)` | Deep Stress #14 · Lazy HTML + Hydr. | ✅ PASS (`L1=460, L2=461`, `0` hydr. err) | ✅ PASS (`L1=460, L2=461`, `0` hydr. err) | ✅ PASS (`L1=460, L2=461`, `0` hydr. err) |

---

## 3. Root-Cause Analysis of the 5 Deterministic Next.js 16.4.3 Failures (+ ⚠️ 1 Intrinsic Flaky Race Condition)

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
  expected Page A to be served from client pageCache with 0 page RSC fetches (host=100) + slotOverride=410, got host=100 pageRscReqs=3
  ```
- **Architectural Cause:**
  - **Dinou v9.0.3** decouples the client-side `pageCache` (horizontal route VNodes) from `slotOverrideCache` + `knownClientSlots` (vertical slot VNodes). When the user visits Page A, soft-navigates to Page B (unmounting Page A's `hscs-page-a-slot`), and calls `refreshSlot("hscs-tag-page-a-slot", { fresh: true })` while on Page B:
    1. Dinou resolves `"hscs-tag-page-a-slot"` against `knownClientSlots`, fetches **only** `/____rsc_slot____/hscs-page-a-slot?fresh=1` in the background, and stores the updated VNode (`410`) in `slotOverrideCache` (`T1 → T2 → T3` synchronization in `rigurous-sinergy-hs-cache-slot.md` Scenario 8).
    2. When the user clicks normal `<Link href="/rigorous/hs-cache-slot">` to return to Page A, Dinou serves Page A's VNode directly from the client `pageCache` (**`0` `/____rsc_page____` network requests**) while `<DinouCacheSlotBoundary>` mounts with `slotOverrideCache.get("hscs-page-a-slot")` (`410`).
  - **Next.js v16.4.3** has no client-side `slotOverrideCache` or background slot endpoint. Calling `updateTag("hscs-tag-page-a-slot")` inside a Server Action while on Page B **purges the entire client-side Router Cache**, forcing the subsequent `<Link href="/rigorous/hs-cache-slot">` click to issue full-page RSC network requests instead of serving Page A from client cache.

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

### ⚠️ Intrinsic Flaky Race Condition in Next.js 16.4.3 — Check 28 (`1 Fail of 3 Execs`): Server Action + `<Suspense>` Background Re-Render Leaking Into Cold Stampede Deduplication
- **Test:** `rigorous-cache-slot-stampede: 6 concurrent cold-miss requests coalesce into 1 slot execution`
- **Route:** `/rigorous/cache-slot`
- **Observed Behavior Across 3 Verification Executions on Next.js 16.4.3 (`⚠️ FLAKY — 1 Fail of 3 execs`):**
  - Passed in 2 of the 3 verification executions (`execCount = 1`), but **failed in 1 of the 3 executions** (`30/36` run) with:
    ```text
    expected stampede protection to execute cold 150ms slot exactly once across 6 concurrent requests, got 2
    ```
- **Root-Cause Investigation in Next.js 16.4.3 Internals (`revalidate.js`, `action-handler.js`, `use-cache-wrapper.js`):**
  1. **Forced Page Re-Render Inside Server Action `POST`:** When a `"use server"` Server Action invoked from `/rigorous/cache-slot` calls `updateTag(...)` (such as `rigorousResetState()` or `rigorousRevalidateTag("cs-tag-stampede")`), Next.js's `revalidate()` in `next/dist/server/web/spec-extension/revalidate.js` unconditionally sets `store.pathWasRevalidated = ActionDidRevalidateStaticAndDynamic`.
  2. **Automatic RSC Flight Stream on `POST`:** Because `store.pathWasRevalidated` is set, `executeActionAndPrepareForRender()` in `next/dist/server/app-render/action-handler.js` sets `skipPageRendering = false` and immediately starts re-rendering the entire current route (`/rigorous/cache-slot`) as an RSC Flight stream inside the Server Action `POST` response (`generateFlight`).
  3. **Premature Client `await` Resolution Due to `<Suspense>` Streaming:** Because the body of `/rigorous/cache-slot` (`CacheSlotDynamicBody`) is wrapped in `<Suspense>` and awaits `connection()`, React Flight flushes **Chunk #1** of the `POST` response (containing the Server Action's return value `actionResult` and the `<Suspense>` fallback) **immediately**, while on the Node.js server `CacheSlotDynamicBody` and its child `"use cache"` slots (including `<CsStampedeSlotContent />`) are still executing asynchronously in the background.
  4. **The Intrinsic Race Window:** On the client, `await resetState()` resolves as soon as Chunk #1 arrives—making the client code believe the Server Action has completely finished when in fact the server still has a dangling background `<Suspense>` render in flight from that `POST`. In Check 28, the client immediately calls `await mutateState({ csStampedeExecCount: 0, csStampedeDelayMs: 150 })`, followed by `await revalidateTag("cs-tag-stampede")` and 6 concurrent `fetch("/rigorous/cache-slot")` calls. Depending on millisecond-level CPU scheduling, the dangling `<Suspense>` stream from the previous `POST` reaches `<CsStampedeSlotContent />` right *after* `mutateState` sets `csStampedeExecCount = 0` (**Execution #1**) and right *before* `revalidateTag("cs-tag-stampede")` expires the tag again and triggers the coalesced fill for the 6 concurrent `GET` requests (**Execution #2**, yielding `execCount = 2` instead of `1`).
- **Why Dinou v9.0.3 Is 100% Deterministic (`1` Execution in Every Run):**
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
| **Impact on Checks 1–30 vs. Checks 1–35** | **30/30** and **35/35** with zero warmup. | Improved from **26/30 (4 failures)** to **27/30 (3 failures)** once two-phase RAM warmup resolved Check 30 (and Check 34 in the 35-check suite). |

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
