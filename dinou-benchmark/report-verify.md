# Rigorous 3D Caching & Streaming Verification Report: Dinou v9.0.3 vs. Next.js v16.4.3

**Date:** November 1, 2026  
**Benchmark Repository:** `dinou-benchmark` (`dev` branch)  
**Frameworks Compared:**
- **Dinou v9.0.3** (`apps/dinou-9` vendorized & `apps/dinou-9-u` unvendorized) — React 19 RSC framework
- **Next.js v16.4.3** (`apps/next` with `cacheComponents: true` / `"use cache"` / PPR enabled) — React 19 App Router

---

## 1. Executive Summary

To evaluate both frameworks beyond synthetic happy-path benchmarks, we implemented the complete **3D Caching & Streaming Matrix** defined across the eight `rigurous-*.md` reference specifications (`rigurous-hs.md`, `rigurous-cache-slot.md`, `rigurous-ppr.md`, `rigurous-sinergy.md`, `rigurous-sinergy-hs-cache-slot.md`, `rigurous-sinergy-hs-ppr.md`, `rigurous-triple-sinergy.md`, and `rigurous-revalidation-scenarios.md`) and expanded `scripts/verify.mjs` from **13 baseline checks** to **30 end-to-end Playwright & HTTP verification checks**.

The 30 checks test three orthogonal caching axes—**Horizontal Segmentation (Layouts vs. Pages)**, **Vertical Segmentation (`<DinouCacheSlot>` / `"use cache"` Micro-ISR)**, and **Partial Prerendering (PPR)**—individually, in all three pairwise combinations, and in full **Triple Synergy**, under both **Clock-Based TTL Expiration (`revalidate = 1s`)** and **On-Demand Surgical Revalidation (`revalidatePage`, `revalidateLayout`, `revalidatePath`, `revalidateTag`, `refreshSlot`)**, including concurrency stampedes and out-of-order race conditions.

### Final Verification Scoreboard

| Framework | Version | Baseline Checks (1–13) | Core 3D Rigorous Suites (14–22) | Deep Stress & Concurrency Edge Cases (23–30) | Total Passed | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dinou 9.0.3** (`apps/dinou-9`) | `9.0.3` | 13 / 13 | 9 / 9 | 8 / 8 | **30 / 30** | **PASS (100%)** |
| **Dinou 9.0.3 (`-u`)** (`apps/dinou-9-u`) | `9.0.3` | 13 / 13 | 9 / 9 | 8 / 8 | **30 / 30** | **PASS (100%)** |
| **Next.js 16.4.3** (`apps/next`) | `16.4.3` | 13 / 13 | 9 / 9 | 4 / 8 | **26 / 30** | **FAIL (4 failures)** |

---

## 2. Complete 30-Check Verification Matrix

| # | Check Name in `scripts/verify.mjs` | Dimension / Suite | Dinou 9.0.3 | Dinou 9.0.3 (`-u`) | Next.js 16.4.3 |
| :-: | :--- | :--- | :---: | :---: | :---: |
| 1 | `ssg: / responds 200` | Baseline SSG | PASS (7.3 ms) | PASS (6.0 ms) | PASS (14.5 ms) |
| 2 | `ssg: / 50 items listing` | Baseline SSG | PASS | PASS | PASS |
| 3 | `ssg: stable HTML across requests` | Baseline SSG | PASS | PASS | PASS |
| 4 | `isr: /items/1 responds 200` | Baseline ISR | PASS (6.7 ms) | PASS (7.1 ms) | PASS (23.7 ms) |
| 5 | `isr: cached and stable HTML` | Baseline ISR | PASS | PASS | PASS |
| 6 | `isr: prerendered route /items/42` | Baseline ISR | PASS | PASS | PASS |
| 7 | `404: nonexistent & validateParams/allowISG routes` | Baseline + HS Guards | PASS | PASS | PASS |
| 8 | `dashboard: responds 200` | Baseline Dynamic SSR | PASS (240.3 ms) | PASS (228.5 ms) | PASS (276.0 ms) |
| 9 | `dashboard: is dynamic (two requests differ)` | Baseline Dynamic SSR | PASS | PASS | PASS |
| 10 | `dashboard: streams 3 holes after fallback` | Baseline Streaming | PASS | PASS | PASS |
| 11 | `ppr: static shell in first chunk` | Baseline PPR | PASS (6.49 ms) | PASS (6.32 ms) | PASS (27.46 ms) |
| 12 | `ppr: hole arrives later (streaming)` | Baseline PPR | PASS (6.71 ms shell) | PASS (3.39 ms shell) | PASS (2.54 ms shell) |
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
| 30 | `rigorous-hs-ppr-ttl & triple-shell-slot: 1s PPR clock TTLs + surgical static-shell slot revalidateTag` | Deep Stress #8 · Triple + TTL | **PASS** (`hosts=100`) | **PASS** (`hosts=100`) | **FAIL** (`Static B=999`) |

---

## 3. Root-Cause Analysis of the 4 Next.js 16.4.3 Failures

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

### Failure #2 — Check 27: No Sub-Component Client Slot Refresh (`refreshSlot` Re-Executes Dynamic Host Layout & Page)
- **Test:** `rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL`
- **Route:** `/rigorous/cache-slot`
- **Observed Error on Next.js 16.4.3:**
  ```text
  wildcard refreshSlot('*', { fresh: true }) must NOT re-execute host layout or host page (got layout=999, page=999)
  ```
- **Architectural Cause:**
  - **Dinou v9.0.3** provides a dedicated vertical-segmentation client primitive (`refreshSlot(idOrTag, { fresh: true })`, including wildcard `refreshSlot("*", { fresh: true })`) backed by `/____rsc_slot____/:id`. When `refreshSlot("*", { fresh: true })` runs on `/rigorous/cache-slot`, each mounted `<DinouCacheSlotBoundary>` fetches only its own isolated slot RSC stream and reconciles it in place via `React.startTransition`. Neither the enclosing dynamic layout (`csLayoutHostSeq`) nor the enclosing dynamic page (`csDynamicHostSeq`) executes on the server (both stay at `100` even when poisoned to `999`).
  - **Next.js v16.4.3** has `"use cache"` for server-side function/component caching, but **no client-addressable slot boundary or slot RSC endpoint**. Refreshing a cached subtree from the browser requires calling a Server Action with `updateTag(...)` followed by `router.refresh()`. Because `router.refresh()` re-renders the full route hierarchy, both the uncached dynamic host layout and uncached dynamic host page re-execute on the server (`layout=999, page=999`).

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

### Failure #4 — Check 30: In-Memory `"use cache"` Cold Misses Across Route Bundles When Invalidating a Static Child's Slot Tag
- **Test:** `rigorous-hs-ppr-ttl & triple-shell-slot: 1s PPR clock TTLs + surgical static-shell slot revalidateTag`
- **Route:** `/rigorous/triple` (PPR Page A) and `/rigorous/triple/static-b` (Static Child Page B with `ppr = false`)
- **Observed Error on Next.js 16.4.3:**
  ```text
  Static B host page must stay 100
  ```
- **Architectural Cause:**
  - In Check 30 Part C, host counters are poisoned to `999` (`tsL1ShellSeq: 999, tsPprAShellSeq: 999, tsStaticBHostSeq: 999`) while **only** slot tags are invalidated via `revalidateTag("ts-tag-layout-shell-slot")`, `revalidateTag("ts-tag-ppr-a-shell-slot")`, and `revalidateTag("ts-tag-static-b-slot")`.
  - **Dinou v9.0.3** persists both the serialized host page shell (`shell.page.json`) and individual slot payloads (`slots/<id>/slot.json`) to `.dinou/dist2/` at build time. When `revalidateTag("ts-tag-static-b-slot")` is called, Dinou sees that `"ts-tag-static-b-slot"` is in `metadata.json`'s `slotTags` (not route `tags`) and executes `revalidatePage("/rigorous/triple/static-b", { onlyRefreshSlots: true })`: it deserializes `shell.page.json` from disk, splices the updated slot (`342`), and re-composes `index.html` and `page.rsc` **without executing `static-b/page.tsx`** (`#ts-static-b-host-seq` remains `100`).
  - **Next.js v16.4.3** exhibits a two-fold architectural limitation under `cacheComponents: true`:
    1. **Route-Level Tag Aggregation on Disk:** During `next build`, Next.js writes the pre-rendered route shell (`static-b.html` / `static-b.rsc`) to disk tagged with the union of every `cacheTag()` called during that route's render (`["ts-static-b-tag", "ts-tag-static-b-slot", ...]`). Calling `updateTag("ts-tag-static-b-slot")` invalidates the entire pre-rendered route shell of `/rigorous/triple/static-b`.
    2. **Ephemeral Per-Bundle In-Memory `DefaultCacheHandler`:** Next.js 16.4.3's default `"use cache"` store (`DefaultCacheHandler`) is an in-memory `Map` that is not persisted to disk across `next build` → `next start`, and `"use cache"` compiler cache keys are scoped per compiled route bundle. Because `/rigorous/triple/static-b`'s bundle had not yet executed in the `next start` process before `updateTag("ts-tag-static-b-slot")` invalidated its build-time route shell, visiting `/rigorous/triple/static-b` forced `TripleStaticPageB()` to re-execute against a cold in-memory `"use cache"` entry for `getTsStaticBHostState()`, leaking the poisoned `999` host state.

---

## 4. Additional Architectural Differences Uncovered During Implementation

Even among the **26 checks that Next.js 16.4.3 passed**, building equivalent implementations exposed several significant ergonomic and architectural differences between Dinou v9.0.3 and Next.js v16.4.3:

| Capability / Mechanism | Dinou v9.0.3 | Next.js v16.4.3 (`cacheComponents: true`) |
| :--- | :--- | :--- |
| **1. Short Clock TTLs (`revalidate = 1s`) in Prerendered Routes** | Works out of the box in `layout_functions.ts`, `page_functions.ts`, and `<DinouCacheSlot revalidate={1}>` inside static or PPR shells without extra wrappers. | **Build-time error** (`Error: Route "...": Next.js encountered uncached or runtime data during prerendering`) whenever a `"use cache"` component has `cacheLife({ expire < 300 })` (`expire: 1`) unless manually wrapped in a `<Suspense>` boundary. |
| **2. Surgical `revalidateLayout(path)` vs. `revalidatePage(path)`** | First-class server primitives in `"dinou/server"`. `revalidateLayout(path)` updates only `layout.rsc` and lazily re-composes child `index.html`/`shell.html` on next `GET`; `revalidatePage(path)` updates only `page.rsc` and reuses cached `layout.rsc`. | `revalidatePath(path, "layout")` and `revalidatePath(path, "page")` in `next/cache` invalidate **both** layout and page caches at `path` (and descendant pages). Achieving surgical layout-only or page-only invalidation in Next.js required manually tagging every layout and page `"use cache"` function with synthetic tags (`layout:${path}`, `page:${path}`) and calling `updateTag(...)`. |
| **3. Persistent Subtree Slot Cache Across Process Restarts** | `dinou build` persists every `<DinouCacheSlot>` to `.dinou/dist2/slots/<id>/slot.json` and every host shell to `shell.page.json` / `shell.layout.json` on disk (or Deno KV / Cloudflare KV). `dinou start` starts warm immediately. | `next build` persists only whole-route HTML/RSC files to `.next/server/app/`. Individual `"use cache"` entries use an in-memory `Map` (`DefaultCacheHandler`) that starts cold when `next start` boots in a new process. |
| **4. Parameter Validation (`validateParams`) & Strict Static Lock (`allowISG = false`)** | Declarative exports in `page_functions.ts` / `layout_functions.ts`: `validateParams(params)` and `export const allowISG = false`. | `dynamicParams = false` is ignored or incompatible with `cacheComponents: true` in Next.js 16.4.3 when combined with dynamic/cached subtrees; requires imperative `notFound()` guards inside every page/layout component body. |
| **5. Layout Hierarchy Escape Hatches (`reset_layout` & `no_layout`)** | Zero-move file markers: drop an empty `reset_layout` or `no_layout` file in any route folder without restructuring parent directories. | No file-marker equivalent; requires refactoring the directory tree into parenthesized Route Groups (`(with-l1)/`, `(reset-branch)/`, `(no-layout)/`) so sibling branches stop inheriting the parent `layout.tsx`. |

---

## 5. Coverage Audit: Have We Tested Everything or Are There Extra Scenarios Left?

Across the **30 checks** currently in `scripts/verify.mjs`, all **8 suites** and **all 10 Clock-TTL + 8 On-Demand Revalidation categories** from `rigurous-revalidation-scenarios.md` are tested.

However, if we want to push the stress testing to the absolute limit, a line-by-line audit of the `rigurous-*.md` documents reveals **5 additional ultra-specific edge cases** that could be added as Checks 31–35:

1. **Unmounted Cross-Route Slot Refresh + Immediate Remount Race (`rigurous-sinergy-hs-cache-slot.md` Scenario 8):**
   - Visit `Page A` (`/rigorous/hs-cache-slot`) so `hscs-page-a-slot` is registered in `knownClientSlots`, then soft-navigate to `Page B` (`/rigorous/hs-cache-slot/page-b`) so `Page A`'s slot is **unmounted** from the DOM.
   - **While viewing `Page B`**, call `refreshSlot("hscs-tag-page-a-slot", { fresh: true })` and *immediately* soft-navigate back to `Page A` (hitting client `pageCache` with `0` `/____rsc_page____` requests).
   - Verify `Page A` renders the updated slot sequence (`knownClientSlots` background fetch + `T1 → T2 → T3` remount synchronization).
   - *Expected outcome:* **Dinou 9.0.3 passes**; **Next.js 16.4.3 will fail** if relying on client router cache without a full server round-trip on `Page A`.

2. **`slotOverrideCache` Shadowing Guard After Live `refreshSlot` Followed by Server `revalidateTag` + `router.refresh()` (`rigurous-triple-sinergy.md` Bug #7 / `rigurous-sinergy-hs-cache-slot.md` Scenario 9):**
   - Call `refreshSlot("hscs-page-a-slot", { fresh: true })` to set a client-side override (`seq = 131`) in `DinouCacheSlotBoundary`.
   - Next, mutate `seq = 132` on the server, call `revalidateTag("hscs-tag-page-a-slot")`, and call `router.refresh()`.
   - Verify `DinouCacheSlotBoundary` detects that the server `children` prop reference changed (`override.baseChildren !== children`), discards the `131` client override, and renders `132` while preserving the inner Client Component's `useState` counter.

3. **Tag-Only `<DinouCacheSlot tags={["cs-tag-only"]}>` (No Explicit `id` Prop) Live `refreshSlot` & `revalidateTag` (`rigurous-cache-slot.md` §2.1 & §3.3):**
   - Verify that a `<DinouCacheSlot>` rendered *only* with `tags={["cs-tag-only"]}` and no `id` attribute derives its canonical identity from `tags[0]` and supports both `refreshSlot("cs-tag-only", { fresh: true })` and `revalidateTag("cs-tag-only")`.

4. **Multi-Level Ancestor Layout Revalidation Cascade (`L1 → L2 → Nested Child`) (`rigurous-triple-sinergy.md` Scenario 11 & `rigurous-hs.md` Scenario 10):**
   - Poison `L2` layout (`999`) and nested child page (`999`) while bumping only `L1` layout (`160`), then call `revalidateLayout("/rigorous/triple")` (ancestor `L1` only).
   - Perform an `F5` reload on `/rigorous/triple/nested` and `/rigorous/triple/nested/static-child` and verify that `maxAncestorGen > leafLayout.generatedAt` cascades the `L1` update through `L2` and lazily re-composes the nested child's HTML (`L1 = 160`) while keeping the nested child page at `100`.

5. **Simultaneous `Promise.all([revalidateLayout, revalidatePage])` Serialization Queue Under `F5` Reload (`rigurous-revalidation-scenarios.md` §2 & §3.3):**
   - Fire `revalidateLayout("/rigorous/hs")` and `revalidatePage("/rigorous/hs/sibling-b")` concurrently in `Promise.all([...])` without awaiting one before the other, then immediately reload `/rigorous/hs/sibling-b` and assert that `enqueueRevalidation` + `nextMonotonicGenTime` produce aligned `index.html`, `layout.rsc`, and `page.rsc` artifacts with `0` React hydration errors.

