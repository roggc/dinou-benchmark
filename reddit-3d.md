# Dinou v9.0.3 vs Next.js v16.4.3: Testing True Orthogonal 3D Caching (Horizontal, Vertical & PPR) across 36 E2E checks and 12 production routes

**TL;DR:** I built [**Dinou**](https://github.com/roggc/dinou) (an independent React 19 Server Components framework with its own native HTTP server — zero Express — and support for esbuild, Rollup, and Webpack) and created an open-source, reproducible benchmark suite ([`dinou-benchmark`](https://github.com/roggc/dinou-benchmark)) to test **Dinou v9.0.3** head-to-head against **Next.js v16.4.3** (Turbopack, `cacheComponents: true`, `"use cache"`, and PPR).

Rather than testing only basic "Hello World" routes, the suite tests all **7 vertices of the 3D Caching & Streaming Cube** (**Horizontal** Layout/Page Segmentation × **Vertical** Component Cache-Slots × **Temporal** PPR Streaming) across **two complete, independent benchmark runs (`Run 1` and `Run 2`)**: **36 end-to-end Playwright behavioral checks × 20 total runs (`720` check executions per framework)** and **12 production HTTP load routes** on a dedicated 4-vCPU / 8 GB RAM DigitalOcean CPU-Optimized Linux droplet (`200` concurrent connections, `30s` duration × `5` passes per run = `10` passes / `300s` per route):

- **3D Behavioral Verification (`36` E2E Checks × `20` Runs = `720` Executions)**: **Dinou passes `36 / 36` in both Run 1 and Run 2 (`720 / 720` = `100.0%`, `0` flaky)**. **Next.js 16.4.3 passes `30 / 36` in Run 1 (`308 / 360`) and `31 / 36` in Run 2 (`310 / 360`) — `618 / 720` (`85.8%`)**, failing 5 surgical invalidation & concurrency checks deterministically (`0/20`) and 1 stampede check flakily (`8/10` in Run 1).
- **HS + Cache-Slot Synergy (`/rigorous/hs-cache-slot`)**: **Dinou delivers `684.7–693.4 req/s` (`p50 = 203–208 ms`, `p99 = 312–325 ms`)** vs. **Next.js at `102.7–110.7 req/s` (`p50 = 1,029–1,039 ms`, `p99 = 19,344–19,753 ms`)** — **`6.26×–6.67×` higher throughput and `60.8×–62.0×` lower `p99` tail latency**.
- **3D Triple Synergy Throughput (`/rigorous/triple` — HS + Cache-Slot + PPR)**: **Dinou delivers `206.8–211.1 req/s` (`p50 = 716–732 ms`, `p99 = 11.2–11.8s`)** vs. **Next.js at `93.7–100.3 req/s` (`p50 = 1,428–1,448 ms`, `p99 = 21.7–22.0s`)** — **`2.10×–2.21×` higher throughput and `2.0×` lower median/tail latency**.
- **Baseline Streaming, PPR & Disk I/O (`/dashboard`, `/ppr`, `/messages`)**: Dinou leads across both runs by **`2.17×` to `2.72×` in throughput** (`504–534 req/s` vs `188–197 req/s` on `/ppr`; `411–422 req/s` vs `154–170 req/s` on `/messages`) and **`4.3×` to `15.0×` lower `p99` latency**.
- **Build, Dev, Bundle Size & Peak RAM (Run 1 / Run 2)**: Dinou builds **`2.22×–2.29×` faster** (`6.39–6.70s` vs `14.54–14.90s`), starts `dev` **`1.63×–1.67×` faster** (`2.09–2.18s` vs `3.48–3.55s`), produces **`7.95×–7.96×` smaller build artifacts on disk** (`7.5 MB` vs `59.6–59.7 MB`), ships **`48.3%` less client JavaScript** (`81.8 KiB` vs `158.3 KiB` brotli), and uses **`2.07×–2.22×` less peak RAM under 200-connection load** (`476.7–492.5 MB` vs `1,019.3–1,060.5 MB`).

---

## 1. What Is "True Orthogonal 3D Caching"? (And Why PPR Is the 3rd Dimension)

Modern React Server Components (RSC) caching is not a 1D problem; it spans **three distinct dimensions**:

1. **X-Axis — Horizontal Segmentation (*Layouts vs. Pages*)**:
   Separating the nested route hierarchy (`RootLayout` → `L1 Layout` → `L2 Layout` → `Page` + parallel `@slots`) so each segment has its own cache lifecycle, its own TTL, and its own surgical invalidation without re-executing parents or children.
2. **Y-Axis — Vertical Segmentation (*Component Cache-Slots*)**:
   Isolating specific component subtrees (`<DinouCacheSlot id="..." tags={[...]}>` in Dinou / `"use cache"` in Next.js) *inside* a Layout or Page so expensive islands can be cached, expired, or live-refreshed in the DOM without re-executing the host Layout or host Page.
3. **Z-Axis — Temporal Segmentation (*PPR — Partial Prerendering*)**:
   Separating delivery across **time** within a single response: serving the instant pre-rendered **Static Shell** at $t = 0$ (`~2.4 ms` TTFB from RAM) while streaming **Dynamic `<Suspense>` Holes** asynchronously at $t > 0$ as they resolve.

```text
                 Z-Axis: Temporal Segmentation (PPR)
              (t = 0 Static Shell vs. t > 0 Suspense Holes)
                                   ▲
                                   │         /rigorous/hs-ppr (X ∩ Z)
                     /rigorous/ppr ●───────────────────────●
                                  /│                      /│
                                 / │                     / │
     /rigorous/ppr-cache-slot   ●───────────────────────●  │  ◄── /rigorous/triple (X ∩ Y ∩ Z)
                  (Y ∩ Z)       │  │                    │  │      [TRIPLE SYNERGY VERTEX]
                                │  │                    │  │      • Dinou: 206.8–211.1 req/s (36/36 PASS)
                                │  ●────────────────────│──●      • Next:   93.7–100.3 req/s (30–31/36 PASS)
                                │ /  (Baseline Origin)  │ /        /rigorous/hs (X-Axis)
                                │/                      │/
  /rigorous/cache-slot (Y-Axis) ●───────────────────────●────────► X-Axis: Horizontal Segmentation (HS)
                               /           ▲                       (Root → L1 → L2 → Page + @slots)
                              /            └── /rigorous/hs-cache-slot (X ∩ Y)
                             ▼
            Y-Axis: Vertical Segmentation (Cache-Slot)
           (Isolated <DinouCacheSlot id / tags> Subtrees)
```

### The Core Architectural Discovery: True End-to-End 3D (Dinou) vs. Server-Only Coupled 2.5D (Next.js)

In geometry and systems architecture, three axes only form a true **3D space** if they are **orthogonal (independent of one another)**: updating or invalidating along one axis **must not destroy or force the re-execution of the other two axes**.

- **Dinou 9.0.3 is a True End-to-End Orthogonal 3D Framework (Server ↔ Network ↔ Client)**:
  Every axis has independent primitives on both server and client:
  - **Horizontal (X)**: Server `revalidateLayout()` vs `revalidatePage()` (with lazy `index.html` re-composition that reuses cached child page RSC payloads without re-running child pages) + client `router.refresh()` (surgical page-only) vs `router.refresh({ layout: true })`.
  - **Vertical (Y)**: `<DinouCacheSlot id="..." tags={[...]}>` is an **addressable boundary across both server and browser DOM**. Calling `refreshSlot('alpha')` or `refreshSlot('*')` fetches *only* that slot's RSC payload, guards against network races with a per-slot monotonic Last-Write-Wins (**LWW**) counter, and patches the live React tree (or updates unmounted routes in `slotOverrideCache`) **without ever re-executing the host Layout or host Page**.
  - **Temporal (Z)**: Full PPR across both Layouts and Pages, composable with `<DinouCacheSlot>` inside both the $t = 0$ Static Shell and $t > 0$ Dynamic `<Suspense>` Holes.

- **Next.js 16.4.3 Implements "2.5D" (3D at Server Render, 1D at Client Invalidation)**:
  Next.js 16 (`cacheComponents: true` + `"use cache"` + PPR) is the only other framework in the ecosystem that attempts all three axes. However, its axes are **coupled during invalidation and client refresh**:
  1. **Its Vertical Axis (`"use cache"`) is blind from the client**: `"use cache"` is pure server-side function memoization with no addressable identity in the browser DOM. When you invalidate a slot tag from a Server Action (`updateTag()`), Next.js **cannot fetch just that cached component** — it is forced to re-execute the entire route top-down (host Layout + dynamic host Page) just to reach the `"use cache"` call. *Moving along the Y-Axis destroys the X-Axis.*
  2. **Its Horizontal Axis collapses on `router.refresh()`**: Calling `router.refresh()` in Next.js unconditionally re-executes the entire vertical hierarchy from Root Layout down to Page.

---

## 2. Behavioral Verification: 36 End-to-End Playwright Checks (× 20 Total Runs across Run 1 & Run 2)

Every check in [`scripts/verify.mjs`](https://github.com/roggc/dinou-benchmark/blob/master/scripts/verify.mjs) runs against a real headless Chromium browser (`Playwright`) across **10 consecutive runs per benchmark pass** (`20` runs = **`720` total check executions per framework** across Run 1 + Run 2) with clean cache snapshots between runs.

- **Dinou v9.0.3**: **`36 / 36` in Run 1 (`360/360`) and `36 / 36` in Run 2 (`360/360`) — `720 / 720` (`100.0%`, `0` flaky)**
- **Next.js v16.4.3**: **`30 / 36` non-flaky in Run 1 (`1` flaky + `5` deterministic failures = `308 / 360`, `85.6%`) · `31 / 36` in Run 2 (`310 / 360`, `86.1%`) — `618 / 720` (`85.8%`)**

### Why Next.js 16.4.3 Fails 6 Checks Across the 3D Cube

| Check # | 3D Axis / Suite | What the E2E Test Verifies | Dinou 9.0.3 (Run 1 / Run 2) | Next.js 16.4.3 (Run 1 / Run 2) | Root Cause in Next.js 16.4.3 |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **#24** | **X-Axis (`HS`)** | `router.refresh()` refreshes *only* the Page (`page=270`) while keeping Layout intact (`layout=100`), vs. `router.refresh({ layout: true })` | **PASS `10/10` · `10/10`** | **FAIL `0/10` · `0/10`** | `router.refresh()` always re-executes the entire branch from Root Layout down (`got layout=270`). |
| **#27** | **Y-Axis (`Cache-Slot`)** | Wildcard `refreshSlot('*', { fresh: true })` updates all slots on the page without re-executing the host Layout or host Page | **PASS `10/10` · `10/10`** | **FAIL `0/10` · `0/10`** | `"use cache"` has no client slot identity; `updateTag()` forces full route re-render (`got layout=999, page=999`). |
| **#28** | **Y-Axis (`Stampede`)** | `revalidateTag()` followed immediately by `6` concurrent cold-miss requests coalesces into exactly `1` slot execution | **PASS `10/10` · `10/10`** | **FLAKY `8/10`** · `10/10` | Non-atomic `revalidateTag()` propagation occasionally serves stale `"use cache"` data (`got 0` executions in 2/10 runs). |
| **#29** | **X ∩ Y (`LWW Race`)** | Out-of-order concurrency race: slow `250 ms` slot refresh dispatched *before* fast `10 ms` slot refresh must not overwrite newer DOM/cache state | **PASS `10/10` · `10/10`** | **FAIL `0/10` · `0/10`** | Lacks per-slot monotonic LWW sequence guard; late `250 ms` response overwrites `402/fresh-fast` with `401/stale-slow`. |
| **#30** | **X ∩ Y (`Unmounted`)** | Refreshing a slot for `Page A` while viewing `Page B`, then soft-navigating back to `Page A` serves `Page A` from client cache (`0` page RSC fetches) with updated slot | **PASS `10/10` · `10/10`** | **FAIL `0/10` · `0/10`** | `updateTag()` evicts `Page A`'s entire client Router Cache entry, forcing `1–3` full page RSC network fetches. |
| **#32** | **Y-Axis (`Tag-Only`)** | Live refresh of a tag-only slot (no explicit `id` prop) updates the slot without re-executing the dynamic host Page | **PASS `10/10` · `10/10`** | **FAIL `0/10` · `0/10`** | `updateTag()` re-executes the dynamic host Page (`expected 100, got 999`). |

---

## 3. Production HTTP Load Benchmark: Run 1 & Run 2 (12 Routes, 200 Connections, 30s × 5 Passes per Run)

**Environment:** Dedicated DigitalOcean CPU-Optimized Droplet (**4 Dedicated Intel Xeon vCPUs, 8 GB RAM**, Ubuntu 24.04 LTS, Node.js v22.23.4). Both frameworks run on the same machine sequentially (`1` production server process + `autocannon` with `200` concurrent connections, `5s` warmup, `30s` duration × `5` passes per route in **Run 1** [`6,073s`] and **Run 2** [`6,048s`]).

> **Why Two Full Runs (`Run 1` with `timeout = 30s` vs. `Run 2` with `timeout = 60s`)?**  
> In **Run 1**, `scripts/load.mjs` used `timeout: Math.max(30, durationSeconds)`, which set `autocannon`'s per-request timeout (`30s`) equal to the test duration (`30s`). Because `autocannon` (`lib/run.js` lines 86–95) initializes client `timeoutTicker` timers (`30,000 ms`) ~40 ms *before* `stopTimer` stops the test, any initial-burst socket still waiting at `t = 30.0s` fired a teardown-race timeout at `+30.04s` (affecting 2 routes in Dinou and 4 routes in Next.js). Profiling with **Grafana `k6`** (`timeout = 60s`) and internal socket telemetry (`/__stats`) proved `0` slow requests inside Node (`max 17–27 ms`) and `100.0%` `200 OK` completion at `30.85s`. In **Run 2**, setting `timeout = 60s` (`2 × duration`) eliminated **100% of timeouts (`0 errors` across all 36 route-framework combinations)** while reproducing Run 1's throughput and latency figures within `1%–5%`.

| Route (3D Vertex) | Dinou 9.0.3 (`Run 1` → `Run 2`: `req/s` · `p50` / `p99` · `TTFB`) | Dinou `-u` (`Run 1` → `Run 2`: `req/s` · `p50` / `p99` · `TTFB`) | Next.js 16.4.3 (`Run 1` → `Run 2`: `req/s` · `p50` / `p99` · `TTFB`) | Dinou Lead vs. Next.js |
| :--- | :---: | :---: | :---: | :--- |
| **`/`** *(SSG)* | `1,424.3` → **`1,432.4 req/s`** · `127`/`176 ms` · `1.45 ms` | `1,385.5` → `1,397.3 req/s` · `128`/`165 ms` · **`1.24 ms`** | `791.5` → `835.8 req/s` · `188`/`392 ms` · `5.59 ms` | **`1.71×–1.80×` req/s · `3.86×–4.20×` faster TTFB** |
| **`/items/42`** *(ISR 60s)* | `1,229.2` → `1,274.1 req/s` · `143`/`185 ms` · `1.18 ms` | `1,250.9` → `1,214.8 req/s` · `144`/`194 ms` · **`1.13 ms`** | `1,235.9` → **`1,292.5 req/s`** · `143`/`181 ms` · `2.03 ms` | **Tied req/s · `1.54×–1.80×` faster TTFB** |
| **`/dashboard`** *(3 Holes)* | `392.7` → `408.0 req/s` · **`461`/`683 ms`** · **`3.05 ms`** | `396.6` → **`409.9 req/s`** · `467`/`693 ms` · `3.12 ms` | `178.9` → `189.2 req/s` · `920`/`9,195 ms` · `7.26 ms` | **`2.17×–2.22×` req/s · `13.5×–13.8×` lower `p99`** |
| **`/ppr`** *(1 Hole)* | `504.0` → `514.4 req/s` · `381`/`479 ms` · `2.42 ms` | `509.6` → **`534.3 req/s`** · **`359`/`461 ms`** · **`2.33 ms`** | `188.2` → `196.6 req/s` · `945`/`6,255 ms` · `2.74 ms` | **`2.71×–2.72×` req/s · `13.6×–15.0×` lower `p99`** |
| **`/messages`** *(Disk I/O)* | `411.0` → **`421.7 req/s`** · **`445`/`1,655 ms`** · **`2.48 ms`** | `409.1` → `420.8 req/s` · `448`/`1,691 ms` · `3.02 ms` | `154.0` → `170.0 req/s` · `1,017`/`7,497 ms` · `6.20 ms` | **`2.48×–2.67×` req/s · `4.3×–4.5×` lower `p99`** |
| **`/rigorous/hs`** *(X-Axis)* | `1,126.5` → `1,180.0 req/s` · `153`/`200 ms` · `1.20 ms` | `1,118.6` → `1,145.0 req/s` · `156`/`199 ms` · **`1.16 ms`** | `1,150.4` → **`1,245.9 req/s`** · `142`/`183 ms` · `2.23 ms` | **Tied req/s · `1.92×–1.98×` faster TTFB** |
| **`/rigorous/cache-slot`** *(Y)* | `215.5` → **`222.1 req/s`** · **`350`/`5,973 ms`** · `4.70 ms` | `210.7` → `215.9 req/s` · `372`/`6,398 ms` · `4.39 ms` | `124.7` → `133.3 req/s` · `917`/`18,552 ms` · **`2.74 ms`** | **`1.67×–1.73×` req/s · `3.01×–3.11×` lower `p99`** |
| **`/rigorous/ppr`** *(Z-Axis)* | **`196.4` → `196.4 req/s`** · **`918`/`7,380 ms`** · `2.29 ms` | `194.2` → `187.3 req/s` · `980`/`7,800 ms` · **`2.24 ms`** | `130.6` → `139.7 req/s` · `1,095`/`15,892 ms` · `3.04 ms` | **`1.41×–1.50×` req/s · `2.15×–2.33×` lower `p99`** |
| **`/rigorous/ppr-cache-slot`** | `187.7` → **`190.3 req/s`** · **`904`/`10,714 ms`** · `2.70 ms` | `185.0` → `181.0 req/s` · `944`/`12,068 ms` · **`2.57 ms`** | `98.6` → `107.1 req/s` · `1,392`/`19,607 ms` · `3.26 ms` | **`1.78×–1.90×` req/s · `1.83×–1.95×` lower `p99`** |
| **`/rigorous/hs-cache-slot`** | `684.7` → `689.0 req/s` · `205`/**`312 ms`** · `1.75 ms` | `656.4` → **`693.4 req/s`** · **`203`**/`328 ms` · **`1.72 ms`** | `102.7` → `110.7 req/s` · `1,029`/`19,344 ms` · `2.96 ms` | **`6.26×–6.67×` req/s · `60.8×–62.0×` lower `p99`** |
| **`/rigorous/hs-ppr`** *(X ∩ Z)* | `191.5` → **`194.7 req/s`** · `980`/**`5,787 ms`** · **`2.17 ms`** | `181.7` → **`194.7 req/s`** · **`964`**/`5,904 ms` · `2.22 ms` | `119.7` → `127.3 req/s` · `1,164`/`18,068 ms` · `3.13 ms` | **`1.53×–1.60×` req/s · `3.12×–3.14×` lower `p99`** |
| **`/rigorous/triple`** *(X∩Y∩Z)* | `206.8` → `209.7 req/s` · `720`/`11,381 ms` · `3.74 ms` | `196.7` → **`211.1 req/s`** · **`716`/`11,191 ms`** · `4.13 ms` | `93.7` → `100.3 req/s` · `1,428`/`21,651 ms` · **`3.36 ms`** | **`2.10×–2.21×` req/s · `1.87×–1.93×` lower `p99`** |

*(Note: Latencies and TTFB shown in the cells above are from Run 2 (`0` errors across all 36 cells); full Run 1 latency tables are in [`report-run1-results.md`](https://github.com/roggc/dinou-benchmark/blob/master/report-run1-results.md) and [`report-run2-results.md`](https://github.com/roggc/dinou-benchmark/blob/master/report-run2-results.md)).*

### Why Is Dinou `6.26×–6.67×` Faster on `/rigorous/hs-cache-slot` (`p99 = 312 ms` vs `19.3s`) and `1.5×–2.7×` Faster Across All Streaming/PPR Routes?
1. **Orthogonal Server Isolation on `/rigorous/hs-cache-slot` ($X \cap Y$)**:
   When a route with a cached Horizontal Segmentation layout and page (`revalidate: 3600`) embeds a single uncached dynamic slot (`revalidate: 0`), Dinou preserves its outer HS cache and re-renders *only* the dynamic slot in `~1.4 ms` of CPU (**`684.7–693.4 req/s`**, `p99 = 312–325 ms`). In Next.js 16.4.3, calling `await connection()` inside the dynamic slot **de-optimizes the entire route into full dynamic SSR**, collapsing throughput by **`6.26×–6.67×`** to `102.7–110.7 req/s` and driving `p99` tail latency to **`19,344–19,753 ms` (~20 seconds)**.
2. **Synchronous Body Flush vs. Event-Loop Yielding (`Grafana k6` Telemetry)**:
   Profiling `/rigorous/cache-slot` with **Grafana `k6`** (`200` VUs) revealed that Dinou flushes the entire cached response body in **`0.27 ms` (`267 µs` `http_req_receiving`)**, whereas Next.js flushes headers at `204 ms` (`http_req_waiting`) and then takes **`799.36 ms` (`~0.8 seconds`)** to finish streaming the body across event-loop turns (`55.52%` of Next.js requests exceed `1.0s` in steady state vs. `0.016%` in Dinou).

---

## 4. Developer Experience, Build Speed, Client Bundle Size & Memory (Run 1 → Run 2)

| Metric (`n = 5` passes per run on 4-vCPU / 8 GB Droplet) | Dinou v9.0.3 (`Run 1` → `Run 2`) | Dinou `-u` v9.0.3 (`Run 1` → `Run 2`) | Next.js v16.4.3 (`Run 1` → `Run 2`) | Dinou Advantage |
| :--- | :---: | :---: | :---: | :--- |
| **Cold Dev Server Start (`dev-start` median)** | **`2.18 s` → `2.09 s`** | `2.27 s` → `2.16 s` | `3.55 s` → `3.48 s` | **`1.63×–1.67×` faster cold start** |
| **Client HMR Latency (`hmr` median)** | **`271 ms` → `266 ms`** | **`271 ms` → `260 ms`** | `314 ms` → `290 ms` | **`1.12×–1.16×` faster HMR (`-24 to -43 ms`)** |
| **Production Build Time (`build` median)** | `6.70 s` → `6.52 s` | **`6.50 s` → `6.39 s`** | `14.90 s` → `14.54 s` | **`2.22×–2.29×` faster build (`-8.0 to -8.4 s`)** |
| **Production Build Output Size on Disk** | **`7.5 MB` → `7.5 MB`** | **`7.5 MB` → `7.5 MB`** | `59.7 MB` → `59.6 MB` | **`7.95×–7.96×` smaller disk footprint** |
| **Client JS Bundle Size (Raw / Gzip / Brotli)** | **`283.3 / 94.2 / 81.8 KiB`** | **`283.3 / 94.2 / 81.8 KiB`** | `585.7 / 182.5 / 158.3 KiB` | **`48.3%` smaller client JS (Brotli)** |
| **Idle RSS Memory** | `275.2` → `275.1 MB` | `275.3` → `275.4 MB` | **`245.9` → `246.5 MB`** | Next.js `~29 MB` lower at idle |
| **Peak RSS Memory Under 200-Conn Load** | **`488.3` → `492.5 MB`** | **`476.7` → `498.7 MB`** | `1,060.5` → `1,019.3 MB` | **`2.07×–2.22×` lower peak RAM (`-527 to -584 MB`)** |
| **Post-Load Settled RSS Memory** | **`488.4` → `492.6 MB`** | **`476.3` → `490.0 MB`** | `1,060.5` → `1,019.4 MB` | **`2.07×–2.23×` lower settled RAM** |

---

## 5. The Broader Ecosystem: Why This Benchmark Makes Dinou 9 the Only 100% Pure 3D Framework in the World Today

Evaluating the current web framework landscape against the three orthogonal axes $(X, Y, Z)$ leads to a direct, data-driven conclusion: **as of today, Dinou 9 is objectively the only framework in the world that implements a complete, 100% pure end-to-end orthogonal 3D architecture.**

A look across every major category in the ecosystem shows why no other framework currently spans all three dimensions:

1. **Traditional SSR & Island Frameworks (Remix / React Router v7, SvelteKit, Nuxt, SolidStart, Astro)**:
   - **Remix / React Router v7, SvelteKit, Nuxt, SolidStart** support nested routing (an X-Axis concept during navigation) and basic promise streaming (`defer` / `<Await>`), but **do not implement React Server Components (RSC)**, true **Partial Prerendering (`PPR`)** from a pre-rendered static shell, or server-rendered **Cache-Slots** that can be surgically refreshed and reconciled in the live DOM without shipping component JS to the browser.
   - **Astro** offers *Server Islands* (`server:defer`), which approximate a deferred hole on initial page load, but lacks a persistent nested RSC layout tree with client state preservation across soft navigations (X-Axis) as well as live addressable RSC slot patching (`refreshSlot`) without page reloads (Y-Axis).
2. **Emerging RSC Frameworks (Waku, TanStack Start, RedwoodSDK)**:
   - While these frameworks embrace React Server Components or nested layouts, none of them simultaneously implement:
     - **X-Axis (`HS`)**: Independent server and client caching of Layouts vs. Pages with distinct clock-based TTLs, separate `revalidateLayout()` vs. `revalidatePage()` primitives, lazy `index.html` re-composition without child re-execution, and surgical page-only `router.refresh()` vs. `router.refresh({ layout: true })`.
     - **Y-Axis (`Cache-Slot`)**: End-to-end addressable `<DinouCacheSlot>` subtrees with live client `refreshSlot()`, atomic tag invalidation with singleflight stampede coalescing, per-slot Last-Write-Wins (LWW) concurrency ordering, and unmounted route slot patching (`slotOverrideCache`).
     - **Z-Axis (`PPR`)**: Full Partial Prerendering across both Layouts and Pages, composable with both Horizontal Segmentation and Vertical Cache-Slots.
3. **Next.js 16 (The Only Other Contender Attempting the 3D Cube)**:
   - Vercel's **Next.js 15/16** is the **only other framework in the world** that attempted to assemble all three pieces (`App Router` nested layouts + `"use cache"` / `cacheComponents` + `PPR`).
   - Because Next.js 16 stops at **"2.5D"** — coupling its axes on client invalidation (`router.refresh()` re-running ancestor layouts, `updateTag()` re-running host layouts/pages, evicting unmounted route caches, lacking per-slot LWW ordering, and de-optimizing `/rigorous/hs-cache-slot` by `6.26×–6.67×` under load) — it scores `30–31 / 36` (`618 / 720` across 20 runs).
   - That leaves **Dinou 9.0.3** as the **only framework in the world that achieves `36 / 36` (`720 / 720` = `100.0%`) across all 7 vertices of the 3D Caching & Streaming Cube**.

---

## 6. Full Reproducibility & Detailed Engineering Reports

Every script, route implementation, and raw telemetry JSON from both runs (`results_run1/` and `results_run2/`) is open-source in the benchmark repository:
- **Benchmark Repository**: [`https://github.com/roggc/dinou-benchmark`](https://github.com/roggc/dinou-benchmark)
- **Dinou Framework Repository**: [`https://github.com/roggc/dinou`](https://github.com/roggc/dinou)
- **Deep-Dive Reports in the Repo**:
  - [`report-3d-architecture.md`](https://github.com/roggc/dinou-benchmark/blob/master/report-3d-architecture.md) — *True End-to-End Orthogonal 3D Architecture (Dinou) vs. Server-Only Coupled Caching (Next.js)*
  - [`report-run2-results.md`](https://github.com/roggc/dinou-benchmark/blob/master/report-run2-results.md) & [`report-run1-results.md`](https://github.com/roggc/dinou-benchmark/blob/master/report-run1-results.md) — *Complete Run 1 (`timeout = 30s`) and Run 2 (`timeout = 60s`) analysis & reproducibility comparison*
  - [`report-verify.md`](https://github.com/roggc/dinou-benchmark/blob/master/report-verify.md) — *Complete breakdown of all 36 E2E Playwright checks across 10-run suites*
  - [`report-timeouts-diagnosis.md`](https://github.com/roggc/dinou-benchmark/blob/master/report-timeouts-diagnosis.md) & [`report-timeouts-diagnosis-for-dumbs.md`](https://github.com/roggc/dinou-benchmark/blob/master/report-timeouts-diagnosis-for-dumbs.md) — *Linux `epoll`, Grafana `k6`, and Autocannon socket-queue telemetry*
  - [`results_run2/REPORT.md`](https://github.com/roggc/dinou-benchmark/blob/master/results_run2/REPORT.md) & [`results_run1/REPORT.md`](https://github.com/roggc/dinou-benchmark/blob/master/results_run1/REPORT.md) — *Auto-generated summary tables and SVG charts*

Happy to answer any questions about how Dinou implements its 3D caching axes, how `<DinouCacheSlot>` reconciles partial RSC trees in the browser without re-running host layouts/pages, or anything about the benchmark methodology!

