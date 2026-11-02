# Benchmark Infrastructure, Hardware Sizing & OS Scheduling Reference (`dinou-benchmark`)

**Date:** November 1, 2026  
**Benchmark Repository:** `dinou-benchmark` (`dev` branch)  
**Target Environment:** DigitalOcean CPU-Optimized Dedicated Droplet (4 Dedicated vCPUs / 8 GB RAM, Regular Intel SSD, Ubuntu 24.04 LTS)

---

## 1. Executive Summary

This document establishes the hardware sizing, storage architecture, operating system scheduling, and load-testing parameter rationale for executing the official `dinou-benchmark` pipeline (`pnpm bench`).

Key architectural conclusions:
1. **4 Dedicated vCPUs / 8 GB RAM is the Optimal Machine Profile:** Because production Node.js servers (`dinou` and `next`) execute on a single JavaScript Event Loop thread (~`1.0 vCPU`) alongside a single-threaded `autocannon` client (~`0.7 vCPU`), total active CPU demand peaks at **~2.0–2.5 vCPUs**. Scaling to 8 vCPUs / 16 GB RAM leaves ~6 vCPUs idle during HTTP load, dev-start, HMR, and memory tests without changing throughput or latency figures.
2. **Regular Intel (Dedicated CPU + SSD) Guarantees Full Comparative Reliability:** What makes cloud benchmarks noisy is **shared vCPU contention (`%st` steal time)**, not Regular vs. Premium Intel generations. On a **CPU-Optimized Dedicated** droplet (`Intel Xeon Platinum 8168 @ 2.70GHz`), physical CPU threads are 100% dedicated. Furthermore, Linux's in-memory **Kernel Page Cache** serves repeated file reads (such as `/messages` reading `data/messages.json`) directly from RAM (`> 6.5 GB` free) after the initial warmup request, eliminating physical SSD latency from HTTP load metrics. Using the exact same 4 vCPU / 8 GB Regular Intel specification also preserves **100% hardware continuity** with `final-report.md` and `deep-dive-investigation.md`.
3. **Unpinned Linux Kernel Scheduling Outperforms Manual `taskset` Pinning on 4 vCPUs:** Running `pnpm bench` without `taskset` allows the Linux kernel scheduler to place the server's main Event Loop thread on one vCPU, `autocannon` on a second vCPU, and utilize the remaining **2 dedicated vCPUs** for Node.js's background `libuv` worker pool (`UV_THREADPOOL_SIZE=4`), V8 parallel garbage collection (Major/Minor GC), and TurboFan JIT compilation threads—without starving the primary Event Loop.
4. **Unified $n = 5$ Median Sampling & High-Concurrency Stress Configuration:** All multi-pass phases (`BUILD_RUNS=5`, `DEV_RUNS=5`, `HMR_RUNS=5`, `LOAD_RUNS=5`, and `5` idle RSS samples) use an odd sample size of **5 independent passes** to report true observed medians while tolerating up to 2 outliers per metric. Load testing defaults to **`LOAD_CONNECTIONS=200`**, **`LOAD_DURATION=30`**, **`LOAD_WARMUP=5`**, and **`LOAD_RUNS=5`**.

---

## 2. Hardware Sizing: Why 4 Dedicated vCPUs / 8 GB RAM vs. 8 vCPUs / 16 GB RAM

| Resource Dimension | 4 Dedicated vCPUs / 8 GB RAM | 8 Dedicated vCPUs / 16 GB RAM | Impact on Benchmark Results |
| :--- | :--- | :--- | :--- |
| **Server Main Event Loop** | Uses `1.0 vCPU` at saturation (`200` connections) | Uses `1.0 vCPU` at saturation (`200` connections) | **Identical** (Single-process Node.js is single-threaded for JS execution) |
| **Server Auxiliary Threads (`libuv` + V8 GC/JIT)** | Uses `~0.2–0.5 vCPU` across idle cores | Uses `~0.2–0.5 vCPU` across idle cores | **Identical** (4 vCPUs already provide ~1.8–2.0 vCPUs of headroom) |
| **Load Generator (`autocannon`)** | Uses `~0.6–0.8 vCPU` | Uses `~0.6–0.8 vCPU` | **Identical** (`autocannon` runs in a single Node.js process) |
| **Idle CPU Headroom Under 200 Connections** | **~1.5–2.0 vCPUs free** | **~5.5–6.0 vCPUs free** | **No change in `req/s`, `p50`, or `p99`** |
| **RAM Headroom** | Peak server RSS is `~390–550 MB` (`> 6.5 GB` free RAM) | `> 14.5 GB` free RAM | **Identical** (Zero swap pressure in either configuration) |
| **Production Build (`scripts/build.mjs`)** | Parallel bundler threads use up to 4 vCPUs | Parallel bundler threads can use up to 8 vCPUs | Only phase where >4 vCPUs slightly reduces wall-clock build time |

### Key Takeaway
Single-process Node.js web servers cannot parallelize their JavaScript Event Loop across additional cores. On a 4-vCPU dedicated droplet, the server Event Loop (`~1.0 vCPU`) and `autocannon` (`~0.7 vCPU`) leave roughly **2 full dedicated vCPUs** available for OS loopback networking, V8 background garbage collection, and `libuv` worker threads. Doubling the droplet to 8 vCPUs / 16 GB RAM merely leaves 4 additional vCPUs sitting at `0%` utilization throughout `load.mjs`, `dev-start.mjs`, `hmr.mjs`, and `memory.mjs`.

---

## 3. CPU & Storage Tier: Regular Intel (SSD) vs. Premium Intel (NVMe SSD)

Within DigitalOcean's **CPU-Optimized (Dedicated CPU)** tier, instances are offered in two hardware sub-options depending on datacenter availability:
- **Regular Intel (SSD):** Dedicated Intel Xeon Skylake / Cascade Lake vCPUs (`Intel Xeon Platinum 8168 @ 2.70GHz`) backed by network-attached SSD storage.
- **Premium Intel (NVMe SSD):** Newer-generation Intel Xeon Ice Lake / Sapphire Rapids vCPUs backed by local NVMe SSD storage.

When resizing or provisioning in regions where `Premium Intel` is unavailable, using **`Regular Intel (SSD)` has 0% negative impact on the scientific reliability, fairness, or validity of the benchmark**.

### 3.1 Why Regular Intel (SSD) Preserves 100% Benchmark Reliability & Fairness

1. **Dedicated Physical CPU Cores (`0%` CPU Steal Time) Are What Guarantee Determinism:**
   - The true enemy of cloud benchmarking is **noisy-neighbor CPU contention (`%st` steal time)** found on shared ("Basic") droplets, where other tenants preempt your vCPUs mid-request.
   - Because **Regular Intel** inside the **CPU-Optimized** category still provides **100% Dedicated vCPUs**, the 4 hardware execution threads are exclusively reserved for your droplet at all times (`0.0%` CPU steal time). Both frameworks execute on identical, uncontested silicon.
2. **Linux Kernel Page Cache (`buff/cache` in RAM) Eliminates Physical SSD Latency During HTTP Load (`load.mjs` & `memory.mjs`):**
   - Out of the **12 benchmarked routes**, **11 routes perform zero filesystem I/O** during HTTP request serving.
   - On the 12th route (`/messages`, which executes `fs.promises.readFile` on `data/messages.json` on every request), the very first requests during the 5-second warmup (`LOAD_WARMUP=5`) cause the Linux kernel to cache `data/messages.json` inside its in-memory **Page Cache (`buff/cache` in RAM)**. Because the droplet has `> 6.5 GB` of free physical RAM and `messages.json` is only a few kilobytes, **100% of subsequent `fs.promises.readFile` syscalls across all 5 measured runs are served directly from RAM in microseconds** without ever touching the physical SSD.
3. **5-Pass Median Aggregation Filters Out Any Storage Jitter in Disk-Writing Phases (`build`, `dev-start`, `hmr`):**
   - In phases that write to the filesystem (`scripts/build.mjs` deleting and writing `.dinou`/`.next`, and `scripts/hmr.mjs` writing `page.tsx`), computing the **median across `5` independent passes** (`BUILD_RUNS=5`, `DEV_RUNS=5`, `HMR_RUNS=5`) automatically discards up to 2 I/O outliers at either tail.
   - Furthermore, Dinou's compiled production output (`.dinou`, `4.4 MB`) is **8.5× smaller on disk** than Next.js's output (`.next`, `37.5 MB`). Measuring build duration on standard SSD accurately reflects real-world CI/CD runners and container filesystems where emitting 8.5× more disk data carries a proportional I/O cost.
4. **100% Hardware Continuity with `final-report.md` and `deep-dive-investigation.md`:**
   - Both [`final-report.md`](./final-report.md) and [`deep-dive-investigation.md`](./deep-dive-investigation.md) were executed on this exact **4 Dedicated vCPUs / 8 GB RAM Regular Intel (`Intel Xeon Platinum 8168 @ 2.70GHz`)** droplet profile, where empirical run-to-run reproducibility was verified at **94.5%–99.0%** (`1.0%–5.5%` variance). Using the same `Regular Intel` tier guarantees strict apples-to-apples continuity across all published reports.

### 3.2 Phase-by-Phase Impact Matrix: Regular Intel (SSD) vs. Premium Intel (NVMe SSD)

| Benchmark Phase | Touches Physical Disk During Measurement? | Impact of Regular Intel (SSD) on Comparative Reliability |
| :--- | :---: | :--- |
| **1. `build.mjs` (`BUILD_RUNS=5`)** | **Yes** (writes `.dinou` / `.next`) | **100% Fair & Reliable:** Median of 5 runs eliminates transient SSD spikes; accurately reflects the I/O cost of writing `4.4 MB` (Dinou) vs. `37.5 MB` (Next.js). |
| **2. `verify.mjs` (`36 checks`)** | **No** (functional assertions) | **Zero Impact:** 100% hardware-independent pass/fail architectural invariants. |
| **3. `bundle.mjs`** | **Reads once** (byte size calculation) | **Zero Impact:** 100% deterministic byte/Gzip/Brotli output sizes. |
| **4. `dev-start.mjs` (`DEV_RUNS=5`)** | **Reads module graph** (cached in RAM after Run 1) | **100% Fair & Reliable:** Linux Page Cache holds `node_modules` in RAM after the first pass; median of 5 runs filters cold-read variance. |
| **5. `hmr.mjs` (`HMR_RUNS=5`)** | **Writes 1 file** (`page.tsx`, `< 4 KB`) | **100% Fair & Reliable:** Single `< 4 KB` write buffered in OS page cache; median of 5 runs ensures clean DOM update latency. |
| **6. `load.mjs` (`LOAD_RUNS=5`, `30s`)** | **No** (11 routes memory-only; `/messages` served from Linux RAM Page Cache after `5s` warmup) | **Zero Storage Impact:** Pure CPU Event Loop + kernel loopback memory benchmark on 100% dedicated Xeon cores. |
| **7. `memory.mjs`** | **No** (samples `/proc/<pid>/status` `VmRSS` in RAM) | **Zero Impact:** Memory allocation depends on V8/OS allocator, not disk speed. |

---

## 4. OS Process Scheduling: Why Not to Use `taskset` During `pnpm bench`

Although manual single-command benchmarks sometimes use `taskset` to pin processes to specific CPU cores, **`pnpm bench` should be executed WITHOUT `taskset`** on the 4-vCPU droplet for two architectural reasons:

### 4.1 Child Process Affinity Inheritance in `scripts/load.mjs`
In [`scripts/load.mjs`](./scripts/load.mjs), the Node.js process running `autocannon` in-memory is the parent process that spawns the framework server via `startServer()` ([`scripts/lib.mjs`](./scripts/lib.mjs)). In Linux, `spawn()` child processes **inherit the CPU affinity mask (`taskset`) of their parent process**:
- If a user runs `taskset -c 0,1 pnpm bench`, both `autocannon` and the framework server are forced onto cores `0,1` while cores `2,3` remain completely idle, creating artificial CPU starvation.

### 4.2 Optimal Thread Distribution Across 4 vCPUs via the Linux Scheduler
Even if the server and client were pinned separately (`0,1` for the server and `2,3` for `autocannon`), manual 2+2 splitting is suboptimal on a 4-vCPU machine:
- **Client side (`autocannon`):** Consumes only `~0.6–0.8` of a single vCPU. Dedicating 2 full vCPUs (`2,3`) exclusively to `autocannon` leaves `> 1.2 vCPUs` wasted.
- **Server side (`dinou` / `next`):** Consists of:
  1. **1 Primary Event Loop Thread** (`~1.0 vCPU` under 200 concurrent connections).
  2. **4 `libuv` Worker Pool Threads** (`UV_THREADPOOL_SIZE=4`, handling asynchronous `fs.promises.readFile` calls on `/messages`, zlib compression, and crypto).
  3. **V8 Background Threads** (parallel Minor/Major Garbage Collection and TurboFan/Maglev background JIT compilation).
- When all **4 vCPUs remain unpinned**, the Linux kernel scheduler (CFS/EEVDF) automatically places the hot server Event Loop thread on one dedicated vCPU, the hot `autocannon` thread on a second dedicated vCPU, and schedules the server's V8 GC, JIT, and `libuv` worker threads across the remaining **2 dedicated vCPUs**—preventing background GC/JIT work from stealing CPU cycles from the server's main Event Loop (and allowing `scripts/build.mjs` to use all 4 vCPUs during compilation).

---

## 5. Optimal Load Testing Parameters (`bench.config.mjs`)

Based on the empirical socket-backlog findings in [`deep-dive-investigation.md`](./deep-dive-investigation.md) and [`final-report.md`](./final-report.md), [`bench.config.mjs`](./bench.config.mjs) is pre-configured with the following production load defaults:

| Parameter | Environment Variable | Default Value | Technical Justification |
| :--- | :--- | :---: | :--- |
| **`connections`** | `LOAD_CONNECTIONS` | **`200`** | At `50` connections, Dinou is barely stressed (`0.65 ms` average internal middleware time). At **`200` concurrent connections**, Dinou's single Event Loop operates near capacity (`~94%` utilization on `/`, keeping `p99 < 1s` on all dynamic routes), while exposing severe event-loop queueing in Next.js (`p99` reaching `5.7s–7.9s`). |
| **`durationSeconds`** | `LOAD_DURATION` | **`30` (`30s`)** | Opening 200 TCP connections simultaneously at $t = 0$ creates an initial kernel listen-backlog burst that takes **`13.63s` in Dinou** and **`25.74s` in Next.js** to fully accept on `/`. A **`30s` duration** (paired with a `30s` Autocannon timeout) is required so both frameworks finish draining the initial 200-socket burst and accumulate `6,000–52,000` steady-state requests per pass. |
| **`warmupSeconds`** | `LOAD_WARMUP` | **`5` (`5s`)** | Runs an unrecorded `5s` burst at full `200` connections before each route to trigger V8 JIT compilation (TurboFan/Maglev) and populate route/kernel caches prior to sampling unloaded `TTFB` and the 5 measured load passes. |
| **`runs`** | `LOAD_RUNS` | **`5` passes** | Unifies the entire benchmark suite at **`n = 5` (odd)** across all phases (`BUILD_RUNS=5`, `DEV_RUNS=5`, `HMR_RUNS=5`, `LOAD_RUNS=5`, `5` idle RSS samples). Across `12 routes × 3 frameworks = 36 route evaluations`, 5 passes protect `p99` tail latency medians against up to 2 transient V8 Major GC pauses per route. |

### Estimated Wall-Clock Execution Time (`LOAD_RUNS=5`, `LOAD_DURATION=30`, `LOAD_WARMUP=5`)
Because `autocannon` runs on fixed wall-clock timers, the execution duration of `scripts/load.mjs` is virtually independent of CPU speed:
- **Per Route:** $5\text{s (warmup)} + \sim 3\text{s (30 sequential TTFB probes)} + (5 \times 30\text{s}) = \mathbf{158\text{ seconds/route}}$.
- **Per Framework (12 Routes):** $12 \times 158\text{s} = 1,896\text{s} \approx \mathbf{31.6\text{ minutes/framework}}$.
- **Full 3-Framework Suite (`dinou-9`, `dinou-9-u`, `next`):** $\approx \mathbf{95\text{ minutes (~1 hour 35 minutes)}}$ for `load.mjs` (or $\approx \mathbf{63\text{ minutes}}$ when running the 2 primary frameworks `--only=dinou-9,next`).

