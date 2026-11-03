# Benchmark Infrastructure, Hardware Sizing & OS Scheduling Reference (`dinou-benchmark`)

**Date:** November 2, 2026  
**Benchmark Repository:** `dinou-benchmark` (`master` branch)  
**Target Environment:** DigitalOcean CPU-Optimized Dedicated Droplet (4 Dedicated vCPUs / 8 GB RAM, Regular Intel SSD, Ubuntu 24.04 LTS)  
**Companion Reports:** [`report-bench-structure.md`](./report-bench-structure.md) · [`report-run1-run2-comparison.md`](./report-run1-run2-comparison.md) · [`report-run2-results.md`](./report-run2-results.md) · [`report-run1-results.md`](./report-run1-results.md) · [`report-verify.md`](./report-verify.md) · [`report-3d-architecture.md`](./report-3d-architecture.md) · [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md) · [`report-timeouts-diagnosis-for-dumbs.md`](./report-timeouts-diagnosis-for-dumbs.md) · [`report-deep-dive-investigation.md`](./report-deep-dive-investigation.md)

---

## 1. Executive Summary

This document establishes the hardware sizing, storage architecture, operating system scheduling, and load-testing parameter rationale for executing the official `dinou-benchmark` pipeline (`pnpm bench`).

Key architectural conclusions:
1. **4 Dedicated vCPUs / 8 GB RAM is the Optimal Machine Profile:** Because production Node.js servers (`dinou` and `next`) execute on a single JavaScript Event Loop thread (~`1.0 vCPU`) alongside a single-threaded `autocannon` client (~`0.7 vCPU`), total active CPU demand peaks at **~2.0–2.5 vCPUs**. Scaling to 8 vCPUs / 16 GB RAM leaves ~6 vCPUs idle during HTTP load, dev-start, HMR, and memory tests without changing throughput or latency figures.
2. **Regular Intel (Dedicated CPU + SSD) Guarantees Full Comparative Reliability:** What makes cloud benchmarks noisy is **shared vCPU contention (`%st` steal time)**, not Regular vs. Premium Intel generations. On a **CPU-Optimized Dedicated** droplet (`Intel Xeon Platinum 8168 @ 2.70GHz`), physical CPU threads are 100% dedicated. Furthermore, Linux's in-memory **Kernel Page Cache** serves repeated file reads (such as `/messages` reading `data/messages.json`) directly from RAM (`> 6.5 GB` free) after the initial warmup request, eliminating physical SSD latency from HTTP load metrics. Using the exact same 4 vCPU / 8 GB Regular Intel specification also preserves **100% hardware continuity** across [`report-run1-results.md`](./report-run1-results.md), [`report-run2-results.md`](./report-run2-results.md), and [`report-deep-dive-investigation.md`](./report-deep-dive-investigation.md).
3. **Unpinned Linux Kernel Scheduling Outperforms Manual `taskset` Pinning on 4 vCPUs:** Running `pnpm bench` without `taskset` allows the Linux kernel scheduler to place the server's main Event Loop thread on one vCPU, `autocannon` on a second vCPU, and utilize the remaining **2 dedicated vCPUs** for Node.js's background `libuv` worker pool (`UV_THREADPOOL_SIZE=4`), V8 parallel garbage collection (Major/Minor GC), and TurboFan JIT compilation threads—without starving the primary Event Loop.
4. **Unified `n = 5` Median Sampling & High-Concurrency Stress Configuration:** All performance phases (`BUILD_RUNS=5`, `DEV_RUNS=5`, `HMR_RUNS=5`, `LOAD_RUNS=5`, and `5` idle RSS samples) use an odd sample size of **5 independent passes** to report true observed medians while tolerating up to 2 outliers per metric, while functional verification executes **`VERIFY_RUNS=10` passes (`36 checks × 10 runs = 360 executions` per run)**. Load testing defaults to **`LOAD_CONNECTIONS=200`**, **`LOAD_DURATION=30`**, **`LOAD_WARMUP=5`**, and **`LOAD_RUNS=5`**.

---

## 2. Hardware Sizing: Why 4 Dedicated vCPUs / 8 GB RAM vs. 8 vCPUs / 16 GB RAM

| Resource Dimension | 4 Dedicated vCPUs / 8 GB RAM | 8 Dedicated vCPUs / 16 GB RAM | Impact on Benchmark Results |
| :--- | :--- | :--- | :--- |
| **Server Main Event Loop** | Uses `1.0 vCPU` at saturation (`200` connections) | Uses `1.0 vCPU` at saturation (`200` connections) | **Identical** (Single-process Node.js is single-threaded for JS execution) |
| **Server Auxiliary Threads (`libuv` + V8 GC/JIT)** | Uses `~0.2–0.5 vCPU` across idle cores | Uses `~0.2–0.5 vCPU` across idle cores | **Identical** (4 vCPUs already provide ~1.8–2.0 vCPUs of headroom) |
| **Load Generator (`autocannon`)** | Uses `~0.6–0.8 vCPU` | Uses `~0.6–0.8 vCPU` | **Identical** (`autocannon` runs in a single Node.js process) |
| **Idle CPU Headroom Under 200 Connections** | **~1.5–2.0 vCPUs free** | **~5.5–6.0 vCPUs free** | **No change in `req/s`, `p50`, or `p99`** |
| **RAM Headroom** | Peak server RSS is `~477–499 MB` in Dinou and `~1,019–1,061 MB` in Next.js (`> 6.0 GB` free RAM) | `> 14.0 GB` free RAM | **Identical** (Zero swap pressure in either configuration) |
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
   - Furthermore, Dinou's compiled production output (`.dinou`, `7.5 MB`) is **8.0× smaller on disk** than Next.js's output (`.next`, `59.6–59.7 MB`). Measuring build duration on standard SSD accurately reflects real-world CI/CD runners and container filesystems where emitting 8.0× more disk data carries a proportional I/O cost.
4. **100% Hardware Continuity Across `report-run1-results.md`, `report-run2-results.md`, and `report-deep-dive-investigation.md`:**
   - [`report-run1-results.md`](./report-run1-results.md), [`report-run2-results.md`](./report-run2-results.md), and [`report-deep-dive-investigation.md`](./report-deep-dive-investigation.md) were all executed on this exact **4 Dedicated vCPUs / 8 GB RAM Regular Intel (`Intel Xeon Platinum 8168 @ 2.70GHz`)** droplet profile, where empirical run-to-run reproducibility was verified at **95.0%–99.6%** (`0.41%` total wall-clock variance between Run 1 [`6,073s`] and Run 2 [`6,048s`], and `1%–5%` metric variance). Using the same `Regular Intel` tier guarantees strict apples-to-apples continuity across all published reports.

### 3.2 Phase-by-Phase Impact Matrix: Regular Intel (SSD) vs. Premium Intel (NVMe SSD)

| Benchmark Phase | Touches Physical Disk During Measurement? | Impact of Regular Intel (SSD) on Comparative Reliability |
| :--- | :---: | :--- |
| **1. `build.mjs` (`BUILD_RUNS=5`)** | **Yes** (writes `.dinou` / `.next`) | **100% Fair & Reliable:** Median of 5 runs eliminates transient SSD spikes; accurately reflects the I/O cost of writing `7.5 MB` (Dinou) vs. `59.6–59.7 MB` (Next.js). |
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

Based on the empirical socket-backlog findings in [`report-deep-dive-investigation.md`](./report-deep-dive-investigation.md) and [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md), [`bench.config.mjs`](./bench.config.mjs) is pre-configured with the following production load defaults:

| Parameter | Environment Variable | Default Value | Technical Justification |
| :--- | :--- | :---: | :--- |
| **`connections`** | `LOAD_CONNECTIONS` | **`200`** | At `50` connections, Dinou is barely stressed (`0.65 ms` average internal middleware time). At **`200` concurrent connections**, Dinou's single Event Loop operates near capacity (`~94%` utilization on `/`, keeping `p99` at `312–725 ms` on `/dashboard`, `/ppr`, and `/rigorous/hs-cache-slot`), while exposing severe event-loop queueing in Next.js (`p99` reaching `6.3s–10.0s` on baseline dynamic routes and `15.9s–22.0s` across the 3D Caching Cube). |
| **`durationSeconds`** | `LOAD_DURATION` | **`30` (`30s`)** | Opening 200 TCP connections simultaneously at `t = 0` creates an initial kernel listen-backlog burst that takes **`13.63s` in Dinou** and **`25.74s` in Next.js** to fully accept on `/`. A **`30s` duration** (paired with a `60s` Autocannon timeout in Run 2, `2 × duration`, vs. `30s` in Run 1) is required so both frameworks finish draining the initial 200-socket burst and accumulate `3,000–43,000` steady-state requests per pass. |
| **`warmupSeconds`** | `LOAD_WARMUP` | **`5` (`5s`)** | Runs an unrecorded `5s` burst at full `200` connections before each route to trigger V8 JIT compilation (TurboFan/Maglev) and populate route/kernel caches prior to sampling unloaded `TTFB` and the 5 measured load passes. |
| **`runs`** | `LOAD_RUNS` | **`5` passes** | Unifies the entire benchmark suite at **`n = 5` (odd)** across all phases (`BUILD_RUNS=5`, `DEV_RUNS=5`, `HMR_RUNS=5`, `LOAD_RUNS=5`, `5` idle RSS samples). Across `12 routes × 3 frameworks = 36 route evaluations`, 5 passes protect `p99` tail latency medians against up to 2 transient V8 Major GC pauses per route. |

### Estimated Wall-Clock Execution Time (`LOAD_RUNS=5`, `LOAD_DURATION=30`, `LOAD_WARMUP=5`)
Because `autocannon` runs on fixed wall-clock timers, the execution duration of `scripts/load.mjs` is virtually independent of CPU speed:
- **Per Route:** `5s (warmup) + ~3s (30 sequential TTFB probes) + (5 × 30s)` = **`158 seconds/route`**.
- **Per Framework (12 Routes):** `12 × 158s = 1,896s` ≈ **`31.6 minutes/framework`**.
- **Full 3-Framework Suite (`dinou-9`, `dinou-9-u`, `next`):** ≈ **`95 minutes (~1 hour 35 minutes)`** for `load.mjs` alone, and **empirically measured at `6,073 seconds` (`1h 41m 13s`) in Run 1 and `6,048 seconds` (`1h 40m 48s`) in Run 2 (`0.41%` variance)** for the complete benchmark pipeline (`dev-start` + `hmr` + `build` + `bundle` + `load` + `memory`).


---

## 6. Verified Droplet Hardware, Kernel & Runtime Fingerprint (`results_run1/env.txt` & `results_run2/env.txt`)

The full hardware, kernel, storage, networking, and runtime fingerprint captured directly from `dinou-benchmark-runner` (`lon1` region) is archived verbatim in [`results_run1/env.txt`](./results_run1/env.txt) and [`results_run2/env.txt`](./results_run2/env.txt):

| Category | Parameter | Verified Value |
| :--- | :--- | :--- |
| **Cloud Provider & Region** | Provider / Datacenter Region | DigitalOcean Droplet (KVM / QEMU `pc-i440fx-6.1`), **`lon1`** (London) |
| **Operating System** | Distribution & Kernel | **Ubuntu 24.04.5 LTS (Noble Numbat)** · Linux `6.8.0-142-generic #142-Ubuntu SMP PREEMPT_DYNAMIC x86_64` |
| **Processor (CPU)** | Model & Microarchitecture | **Intel(R) Xeon(R) Platinum 8168 CPU @ 2.70GHz** (Family `6`, Model `85`, Stepping `4`, `5387.33 BogoMIPS`, `AVX2` / `AVX-512` enabled) |
| **CPU Topology & Isolation** | vCPUs / NUMA / Steal Time | **`4` Dedicated vCPUs** (`1` Socket × `4` Cores × `1` Thread/core, NUMA node `0`, **`st = 0%` CPU Steal Time** verified via `vmstat`) |
| **CPU Cache Hierarchy** | L1d / L1i / L2 Cache | **L1d:** `128 KiB` (`4 × 32 KiB`) · **L1i:** `128 KiB` (`4 × 32 KiB`) · **L2:** `16 MiB` (`4 × 4 MiB`) |
| **CPU Security Mitigations** | Hardware/Kernel Mitigations | Meltdown (`PTI`), Spectre v1/v2 (`IBRS`, `IBPB conditional`, `BHI SW loop`), L1TF (`PTE Inversion`), MDS (`Clear CPU buffers`), Retbleed (`IBRS`), Spec Store Bypass (`prctl`) |
| **Memory & Swap** | Physical RAM / Swap / THP | **`7.8 GiB` RAM** (`8,131,780 kB MemTotal`, `~7.2 GiB` available at idle) · **`4.0 GiB` Swap** (`0 B` used) · Transparent Huge Pages: `[madvise]` (`2048 kB` page size) |
| **Storage & Filesystem** | Root Block Device & Mount | **`50 GB` SSD (`/dev/vda1`, `48G` usable)** · **`ext4`** mounted with `rw,relatime,discard,errors=remount-ro,commit=30` |
| **Kernel Networking (`sysctl`)** | TCP & File Descriptor Limits | `ulimit -n = 65535` · `net.core.somaxconn = 65535` · `net.ipv4.tcp_max_syn_backlog = 65535` · `ip_local_port_range = 10240 65000` · `tcp_tw_reuse = 1` · `tcp_congestion_control = cubic` · `fs.file-max = 2097152` |
| **Node.js & Internal Engines** | Runtime & C++ Dependencies | **Node.js `v22.23.4`** (`x64`) · **V8** `12.4.254.21-node.57` · **libuv** `1.51.0` · **llhttp** `9.4.3` · **undici** `6.29.1` · **OpenSSL** `3.5.9` · **Brotli** `1.1.0` · **zlib** `1.3.1-e00f703` · **zstd** `1.5.7` · **simdutf** `6.4.2` · **simdjson** `4.5.0` · **ada** `2.9.2` |
| **Benchmark Toolchain** | Package Manager & Harness | **`pnpm 12.15.0`** · **`autocannon v8.0.0`** · **`playwright 1.64.1`** |
