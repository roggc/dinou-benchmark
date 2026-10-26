# Deep Dive Investigation: High-Concurrency Socket Backlog, Event Loop Contention, and Cold-Start Latency in Node.js Web Frameworks

> **An empirical investigation into tail latencies, connection bursts, and HTTP performance comparing Dinou 9.0.0 and Next.js 16.4.2 under 200 concurrent connections on route `/` (SSG).**

---

## 1. Executive Summary

During high-concurrency HTTP load testing (200 concurrent connections over HTTP/1.1 keep-alive) on a dedicated DigitalOcean droplet (4 Intel vCPUs / 8 GB RAM), an apparent paradox emerged:

- **Autocannon** reported ~20–30 client-side timeouts specifically on fast static routes (`/` SSG and `/items/42` ISR) at 200 connections, while dynamic routes (`/dashboard`, `/ppr`, `/messages`) completed with **0 timeouts**.
- Under independent diagnostic load testing on route `/` (SSG) with **Grafana k6** (Go multi-threaded network stack), **100% of requests succeeded** (`43,453 / 43,453 checks passed` for Dinou, `23,320 / 23,320` for Next.js, 0 failures), but maximum latency peaked at **13.76 seconds** for Dinou and **25.74 seconds** for Next.js.

Through a multi-stage diagnostic suite examining the Linux kernel TCP stack, client-side request timestamp streaming, and server-side socket lifecycle tracking, we isolated the underlying mechanics:

1. **Middleware Overhead vs Event Loop Queueing**: Inside Dinou 9.0.0, the average wall-clock duration from request entry to `res.on('finish')` was **0.65 ms** (maximum **9 ms**). The client-perceived mean latency of **138.2 ms** (median **127.5 ms**) is almost entirely queueing delay: with 200 concurrent connections sharing a single JavaScript thread in a closed loop, each request waits in turn while the event loop processes preceding requests.
2. **100% of Delayed Requests Originated in the Initial Cold-Start Burst**: In both frameworks, all delayed requests (> 1.0s) were dispatched within the first **~65 milliseconds** (Dinou $+0.025\text{s} - +0.026\text{s}$, Next.js $+0.064\text{s} - +0.065\text{s}$) when 200 TCP connections opened simultaneously on `localhost`. Over the remaining 29+ seconds of steady load, **zero requests exceeded 1.0s**.
3. **The Bottleneck Occurs Before Socket Acceptance**:
   - The Linux kernel listen queue experienced no drops or overflows (`TcpExtListenOverflows = 0`, `TcpExtListenDrops = 0`).
   - Node.js accepted all 200 connections, but the final connection was accepted at **$t = 13.627\text{s}$** into the test.
   - Once accepted by Node.js, the time to parse and begin processing the first HTTP request was at most **0.268 seconds**.
   - The primary delay occurred while sockets waited in the kernel listen backlog to be accepted by Node's single-threaded event loop, which was heavily occupied servicing active keep-alive streams.
4. **Data Transfer Disparity**: Next.js transferred ~1.7 GB across 23,320 requests (**~73 KB/req**), compared to Dinou's ~1.2 GB across 43,453 requests (**~28 KB/req**)—a ratio of ≈ 2.6×. Transmitting substantially more bytes per request increases socket I/O buffer drain time, which is a plausible contributing factor to Next's longer event loop ticks and slower backlog drainage (25.74s max vs 13.76s).

---

## 2. Testbed & Hardware Configuration

All measurements were executed on an isolated cloud instance. Exact environment versions and hardware parameters obtained directly from the host system:

| Parameter | Specification / Command Output |
| :--- | :--- |
| **Compute / CPU** | 4 Dedicated vCPUs: `Intel(R) Xeon(R) Platinum 8168 CPU @ 2.70GHz` |
| **Memory** | 7.8 GiB Physical RAM (`free -h`: 571 MiB used, 7.2 GiB available) |
| **Swap Space** | 4.0 GiB NVMe Swap (`/swapfile`) |
| **Operating System** | Ubuntu 24.04 LTS |
| **Linux Kernel** | `6.8.0-142-generic` |
| **File Descriptor Limit (`ulimit -n`)** | `65535` |
| **Kernel Listen Backlog (`somaxconn`)** | `65535` (`net.core.somaxconn`) |
| **Node.js Runtime** | `v22.23.4` |
| **Package Manager** | `pnpm v12.15.0` |
| **Grafana k6** | `v0.54.0` (commit `baba871c8a`, `go1.23.1`, `linux/amd64`) |
| **Autocannon** | `v8.0.0` |
| **Frameworks Tested** | Dinou 9.0.0 vs Next.js 16.4.2 (both with React 19.3.1) |

---

## 3. Investigation Chronology & Diagnostic Phases

```text
+-------------------------------------------------------------------------------+
| INITIAL SYMPTOM                                                               |
| Autocannon client-side timeouts (10s) on static routes at 200 connections     |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+-------------------------------------------------------------------------------+
| PHASE 1: Kernel TCP Queue Inspection (`nstat -az`)                            |
| Metrics: TcpExtListenOverflows = 0, TcpExtListenDrops = 0                     |
+-------------------------------------------------------------------------------+
                                       |
                                       +--> [Result: Kernel Queue Overflows Excluded]
                                       |
                                       v
+-------------------------------------------------------------------------------+
| PHASE 2: Independent Client Cross-Validation (Grafana k6, Route /, 30s)      |
| Result: 100.00% Success (0 errors, 43,453 / 43,453 checks passed)            |
| Metric: http_req_duration max = 13.76s (Dinou) vs 25.74s (Next.js)            |
+-------------------------------------------------------------------------------+
                                       |
                                       +--> [Result: Delay confirmed real; failures were client-side aborts]
                                       |
                                       v
+-------------------------------------------------------------------------------+
| PHASE 3: Internal Server-Side Execution Timing (`dinou.config.js`)            |
| Metrics: Max middleware execution = 9 ms | Average execution = 0.65 ms        |
| Result: Zero requests took > 100 ms in middleware                             |
+-------------------------------------------------------------------------------+
                                       |
                                       +--> [Result: Slow requests not caused inside request handling]
                                       |
                                       v
+-------------------------------------------------------------------------------+
| PHASE 4: Request Start Timestamp Streaming (`k6 JSON logs`)                   |
| Finding: 100% of slow requests dispatched at t < 0.065s                       |
| Finding: Steady state [1s - 30s] had ZERO requests > 1.0s                     |
| Finding: Responses drained at ~120-130 ms (Dinou); ~240-250 ms (Next.js)      |
+-------------------------------------------------------------------------------+
                                       |
                                       +--> [Result: Initial Cold-Start Burst Isolated]
                                       |
                                       v
+-------------------------------------------------------------------------------+
| PHASE 5: Socket Lifecycle & Accept Queue Instrumentation                      |
| Metrics: Latest socket accepted into test = 13.627s                           |
| Metrics: Wait time from accept -> 1st request parsed = 0.268s                 |
+-------------------------------------------------------------------------------+
                                       |
                                       v
+===============================================================================+
| CONCLUSION: BACKLOG QUEUING PRIOR TO SOCKET ACCEPTION                         |
| Active keep-alive streams occupy the single event loop; pending sockets sit   |
| in the kernel queue until the loop accepts them across successive cycles.     |
+===============================================================================+
```

### Phase 1: Linux Kernel TCP Queue Auditing

A potential cause of client-side timeouts during sudden 200-connection bursts is the operating system's listen backlog overflowing (`somaxconn` exhaustion). 

We monitored the Linux network stack counters before and after 30-second load bursts using `nstat -az`:

```bash
nstat -az TcpExtListenOverflows TcpExtListenDrops
cat /proc/sys/net/core/somaxconn
```

**Results:**
- `somaxconn`: `65535`
- `TcpExtListenOverflows`: `0`
- `TcpExtListenDrops`: `0`

**Conclusion**: There were zero listen-queue overflows and zero listen-queue drops in the Linux kernel. The kernel successfully held all 200 established connections in its listen backlog.

---

### Phase 2: Independent Client Validation (Grafana k6 on Route `/`)

Autocannon's per-request timeout defaults to 10 seconds (`timeout: 10`). In tests where initial sockets were held in the queue for > 10 seconds, Autocannon aborted them with `reqError: request timed out` at $t \approx 10.04\text{s}$.

To eliminate client-side Node.js event-loop contention inside Autocannon itself, an independent diagnostic test was conducted targeting the home route (`/`, SSG · 50 items list) using **Grafana k6** (written in Go with a multi-threaded goroutine networking stack):

- **Target Route**: `/` (SSG · 50 items list).
- **Execution**: Single diagnostic run per framework ($n = 1$).
- **Scenario**: 200 Virtual Users (VUs) constantly looping for 30 seconds.
- **Client Protocol**: HTTP/1.1 with Keep-Alive enabled.
- **Experimental Conditions**:
  - Dinou was running with diagnostic instrumentation active (in-memory timing counters, connection listener, request middleware).
  - Next.js was running uninstrumented (`node run.mjs start`).
  - Keep-Alive configurations: Dinou with `keepAliveTimeout: 65000`, `headersTimeout: 66000`; Next.js with `--keepAliveTimeout 65000`.

#### 30-Second k6 Benchmark Results on Route `/` (SSG, $n = 1$)

| Metric | Dinou 9.0.0 (Port 3103) | Next.js 16.4.2 (Port 3102) | Delta / Ratio |
| :--- | :--- | :--- | :--- |
| **Throughput** | **1,441.6 req/s** | 771.3 req/s | **+86.9% (1.87× faster)** |
| **Total Completed Requests (30s)** | **43,453** | 23,320 | **+86.3%** |
| **Total Data Received** | ~1.2 GB | ~1.7 GB | Next transferred 41% more data |
| **Average Payload per Request** | **~28 KB** | ~73 KB | Next is ≈ 2.6× larger |
| **HTTP Checks Passed (200 OK)** | **100.00% (43,453 / 43,453)** | **100.00% (23,320 / 23,320)** | Zero dropped requests |
| **Connection Time (`http_req_connecting`)** | avg=18.7µs, max=12.9ms | avg=86.2µs, max=41.4ms | Fast TCP handshake |
| **Mean Latency (`avg`)** | **138.19 ms** | 257.81 ms | **46.4% lower** |
| **Median Latency (`p50`)** | **127.51 ms** | 197.65 ms | **35.5% lower** |
| **95th Percentile Latency (`p95`)** | **141.16 ms** | 261.13 ms | **45.9% lower (1.85× faster)** |
| **Max Latency (`max`)** | **13.76 s** *(13.77s in JSON log)* | **25.74 s** | Cold burst artifact |

#### Observations on Test Duration & Little's Law:
1. **Backlog Drainage vs Test Duration**: In a preliminary 15-second test, Next.js reached a maximum latency of **15.2 seconds**—virtually the entire duration of the test—indicating that its queue had not finished draining when the test stopped. When duration expanded to 30 seconds, Next's maximum latency grew to **25.74 seconds**. In contrast, Dinou's max latency was **~14.4 s** (15 s test) and **~13.8 s** (30 s test), i.e. independent of test duration.
2. **Closed-Loop Concurrency (Little's Law)**: In a closed loop (200 VUs dispatching a new request immediately upon receiving a response), throughput and latency are mathematically bound by **Little's Law** ($L = \lambda W \implies W = L / \lambda$):
   $$\text{Dinou: } W = \frac{200}{1,441.6\text{ req/s}} \approx 138.7\text{ ms} \quad (\text{measured mean: } 138.19\text{ ms})$$
   $$\text{Next.js: } W = \frac{200}{771.3\text{ req/s}} \approx 259.3\text{ ms} \quad (\text{measured mean: } 257.81\text{ ms})$$
   Thus, "+86.9% throughput" and "46% lower latency" reflect the same underlying performance relationship. Furthermore, the mean latency represents the full round-trip cycle time of the 200 connections cycling through the server.

---

### Phase 3: Server-Side Request Duration Instrumentation

To determine how much time was spent inside the application logic versus external event-loop queueing, we injected high-resolution measurement middleware into Dinou 9:

```javascript
// apps/dinou-9/dinou.config.js (Diagnostic probe)
let maxDurationMs = 0;
let totalDurationMs = 0;
let topSlowInsideNode = [];

configureServer({ server, use }) {
  use((req, res, next) => {
    const reqStart = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - reqStart;
      totalDurationMs += duration;
      if (duration > maxDurationMs) maxDurationMs = duration;
      if (duration > 100) {
        topSlowInsideNode.push({ url: req.url, durationMs: duration });
      }
    });
    next();
  });
}
```

#### Metrics Recorded Inside Dinou 9.0.0:
- **Total requests received by server**: `43,453`
- **Total responses finished by server**: `43,453`
- **In-flight requests remaining**: `0`
- **Max internal middleware duration**: **`9 ms`**
- **Average internal middleware duration**: **`0.65 ms`**
- **Requests taking > 100 ms in middleware**: **`0`**

#### Clarification on Middleware Timing vs Client Latency:
The `0.65 ms` figure reflects the wall-clock duration measured from the moment the request enters the middleware to the `res.on('finish')` event. It does **not** mean the client receives responses in 0.65 ms. With 200 concurrent keep-alive connections sharing a single-threaded event loop, almost all of the client-perceived round-trip (~138 ms mean) is queueing time: each request waits its turn while Node.js reads, parses, executes, and writes responses across the other active streams.

*Sanity Check on Single-Thread Utilization*: $0.65\text{ ms} \times 1,441.6\text{ req/s} \approx 0.94\text{ s}$ of in-middleware wall-clock time per second (estimate), which is consistent with a near-saturated single event loop operating close to its capacity.

---

### Phase 4: Request Start Timestamp Streaming & Window Bucketing

By streaming k6's raw JSON metric logs (`k6 run --out json=results/k6.json`), we calculated the exact moment every request was initiated relative to test start:

$$t_{\text{start}} = t_{\text{finished}} - t_{\text{duration}}$$

#### Breakdown of Requests Taking > 1.0s by Dispatch Timestamp

| Dispatch Time Window | Dinou 9.0.0 Slow Requests (> 1s) | Next.js 16.4.2 Slow Requests (> 1s) |
| :--- | :--- | :--- |
| **Burst Window `[0.0s - 1.0s]`** | **141 requests** (Max: 13.77s) | **165 requests** (Max: 25.74s) |
| **Steady Window `[1.0s - 5.0s]`** | **0 requests** | **0 requests** |
| **Steady Window `[5.0s - 15.0s]`** | **0 requests** | **0 requests** |
| **Steady Window `[15.0s - 30.0s]`** | **0 requests** | **0 requests** |
| **Wrap-up Window `[> 30.0s]`** | **0 requests** | **0 requests** |

#### Slowest Individual Requests (Top 10):

```text
Dinou 9.0.0 (Port 3103):
  - Duration: 13.77s | Sent at: +0.026s into test | Status: 200
  - Duration: 13.65s | Sent at: +0.026s into test | Status: 200
  - Duration: 13.52s | Sent at: +0.026s into test | Status: 200
  - Duration: 13.39s | Sent at: +0.026s into test | Status: 200
  - Duration: 13.27s | Sent at: +0.026s into test | Status: 200
  - Duration: 13.16s | Sent at: +0.026s into test | Status: 200
  - Duration: 13.05s | Sent at: +0.025s into test | Status: 200
  - Duration: 12.94s | Sent at: +0.026s into test | Status: 200
  - Duration: 12.83s | Sent at: +0.026s into test | Status: 200
  - Duration: 12.72s | Sent at: +0.025s into test | Status: 200

Next.js 16.4.2 (Port 3102):
  - Duration: 25.74s | Sent at: +0.065s into test | Status: 200
  - Duration: 25.49s | Sent at: +0.064s into test | Status: 200
  - Duration: 25.24s | Sent at: +0.064s into test | Status: 200
  - Duration: 25.01s | Sent at: +0.064s into test | Status: 200
  - Duration: 24.77s | Sent at: +0.065s into test | Status: 200
```

#### Observation on Completion Intervals vs Mean Latency:
- In Dinou, the delayed burst requests finished sequentially at regular intervals of **$\Delta t \approx 120 - 130\text{ ms}$**, which aligns closely with its **mean round-trip latency of 138.2 ms**.
- In Next.js, the delayed burst requests finished sequentially at intervals of **$\Delta t \approx 240 - 250\text{ ms}$**, which aligns closely with its **mean round-trip latency of 257.8 ms**.

Because each full round of 200 requests takes ~138 ms (Dinou) or ~258 ms (Next), the queued connections resolve at the pace of that cycle time.

---

### Phase 5: Socket Lifecycle & Accept Queue Timing

To determine whether the delay occurred in the OS `accept()` call or during socket `read()` and HTTP header parsing, lifecycle hooks were attached to the server in Dinou 9:

```javascript
server.on("connection", (socket) => {
  totalConnections++;
  socket._acceptedAt = Date.now();
  socket._acceptedRelMs = Date.now() - testStartTime;
  socket._reqCount = 0;
});

// Inside HTTP request middleware:
const socket = req.socket;
if (socket) {
  socket._reqCount = (socket._reqCount || 0) + 1;
  if (socket._reqCount === 1) {
    const waitMs = reqStart - socket._acceptedAt;
    if (waitMs > maxWaitBeforeFirstReqMs) maxWaitBeforeFirstReqMs = waitMs;
  }
}
```

#### Empirical Measurements:
- **Total TCP sockets accepted by Node**: `200`
- **Latest socket accepted into test**: **`13.627 seconds`**
- **Maximum wait from `accept()` to 1st request parsed**: **`0.268 seconds`**
- **Requests delayed > 1.0s after socket accept**: **`0`**
- **Maximum request duration inside middleware**: **`0.009 seconds`**

#### Diagnostic Finding:
These figures represent upper bounds across separate instrumentation points rather than sequential components of one single request. However, they demonstrate the locus of delay:

- The last socket was admitted by Node.js at **$t = 13.627\text{ s}$**.
- Once admitted, no socket waited more than **0.268 s** for its first HTTP request to be parsed.
- Once parsed, no request took more than **0.009 s** within the middleware.

Therefore, the vast majority of the 13.76-second tail latency observed by k6 was spent while the socket resided in the kernel connection backlog waiting for Node.js to invoke `accept()`.

---

## 4. Architectural Analysis: Mechanics of the Connection Burst

When 200 TCP connections establish simultaneously against a single-process Node.js server on `localhost`:

1. **Kernel Handshake (`http_req_connecting`)**: The Linux kernel completes the 3-way TCP handshake rapidly (k6 recorded `http_req_connecting` maximums of 12.9 ms for Dinou and 41.4 ms for Next.js; averages were 18.7 µs and 86.2 µs respectively) and enqueues established sockets in the TCP listen backlog.
2. **Event Loop Saturation**: Node.js accepts an initial batch of connections. Because HTTP keep-alive is active, these connected clients immediately begin sending rapid HTTP requests.
3. **Placing `accept()` in the Event Loop**: In Node.js, network I/O events (reading requests, writing responses, accepting sockets) are processed sequentially in the poll phase of the libuv event loop. When the loop is heavily occupied servicing incoming requests and rendering responses for already-connected sockets, pending sockets in the kernel queue must wait for successive loop iterations to be accepted.
4. **The Dynamic Route Contrast: Why Dynamic Routes Produced Zero Timeouts in Autocannon**:
   A compelling observation consistent with this event-loop model is the contrast between route types in the main Autocannon benchmark:
   - On static routes (`/` SSG and `/items/42` ISR), each request executes synchronously with minimal processing (< 1 ms). The single thread is continuously busy with active CPU work, leaving few idle gaps for the loop to service the incoming accept queue during sudden bursts.
   - On dynamic routes with simulated I/O (`/dashboard` and `/ppr`), each request incorporates artificial asynchronous delays (`holeDelayMs: 200` via `await sleep(200)` simulating Suspense slots or database queries).
   - On `/messages` (SSR), there is no artificial sleep timer; instead, each application performs asynchronous disk file I/O via `fs.promises.readFile` on its own local JSON message store (none of the applications use synchronous `readFileSync` or in-memory caching). Because file I/O is dispatched asynchronously to libuv's worker thread pool, latency is decoupled from the artificial 200 ms sleep (e.g. Dinou 9: p50 ~100 ms at 50 connections; Next.js: p50 ~237 ms at 50 connections).
   - In both dynamic scenarios, while the JavaScript thread awaits pending asynchronous operations (timer completion or threadpool file I/O), control yields back to the event loop, which is consistent with the event loop having idle gaps in which pending sockets can be accepted. Socket accept timing was not instrumented on these routes; our empirical data on them is bounded to Autocannon observing zero client-side timeouts under 200 connections, compared to ~20–30 timeouts on static routes.
5. **Hypothesis on Sequential Socket Drainage**:
   The regular intervals between slow request completions (~120–130 ms in Dinou, ~240–250 ms in Next.js) suggest that during extreme saturation, new connections from the listen backlog are admitted at a constrained pace across successive loop cycles, taking dozens of loop cycles to drain the tail of the backlog.
6. **The Impact of Payload Size**:
   Next.js transferred **~1.7 GB** over 23,320 requests (**~73 KB/req**), whereas Dinou transferred **~1.2 GB** over 43,453 requests (**~28 KB/req**)—a ratio of ≈ 2.6×. Transmitting substantially more bytes per request increases socket I/O buffer drain time and data serialization, which is a plausible contributing factor to Next's longer event loop ticks and slower backlog drainage (25.74s in Next.js vs 13.76s in Dinou).

---

## 5. Benchmarking Implications & Methodological Recommendations

1. **Maximum Latency in Instant Cold Bursts is Misleading**:
   - In synthetic tests where 200 connections are established at $t=0$, maximum latency measures how long the last connection sat in the kernel queue during the initial burst, **not** ongoing server response capacity.
   - During steady-state operation ($t \in [1\text{s}, 30\text{s}]$), neither framework produced any request slower than 1.0 second.
2. **Percentiles (p95 / p99) Reflect Sustainable User Experience**:
   - Percentile metrics filter out anomalous connection handshake and cold-start queueing artifacts.
   - At p95 on route `/`, Dinou responded in **141.2 ms**, compared to Next.js at **261.1 ms** (1.85× faster).
3. **Use Connection Ramp-Up / Warm-Up Periods**:
   - Introducing a brief ramp-up stage (e.g. `k6 stages: [{ duration: '5s', target: 200 }]`) allows sockets to establish before steady-state throughput and latency are recorded.
4. **Align Client Timeouts with Benchmark Duration**:
   - Autocannon's default 10s per-request timeout causes premature aborts during 30s tests. Setting `timeout: Math.max(30, duration)` ensures all requests complete and are recorded accurately.
   - *Note*: Extending Autocannon's timeout converts what were formerly reported as timeouts into tail latency entries. Benchmark results with adjusted timeouts should be documented clearly when comparing against earlier runs.
5. **Use Multiple Test Runs (`LOAD_RUNS >= 3`)**:
   - For official publication across all routes, running at least 3 runs per route is necessary to compute reliable median and percentile values.

---

## 6. Production Mitigations for High-Traffic Deployments

In production web deployments, traffic patterns and infrastructure differ significantly from synthetic single-process localhost tests:

1. **Multi-Process Clustering (`node:cluster` / Containers)**:
   - On Linux, `node:cluster` distributes incoming connections from a shared server port across worker processes using a round-robin mechanism by default. Spreading connections across multiple event loops reduces single-thread queue dwell times.
2. **Reverse Proxy & Connection Pooling (Nginx, Envoy, Cloudflare)**:
   - Fronting Node.js with an edge proxy terminates client TCP connections and multiplexes HTTP requests over established, persistent upstream keep-alive connections to the backend.
3. **Server Keep-Alive Tuning**:
   - Explicitly configuring `keepAliveTimeout` and `headersTimeout` in the server ensures that established connections remain open during continuous client traffic, which is beneficial behind a reverse proxy or load balancer. *Note*: In our localhost tests under a cold 200-connection burst, tuning keep-alive did not prevent the initial accept backlog, as the bottleneck occurs prior to socket acceptance.

---

## 7. Comparative Summary Scorecard — Route `/` (SSG · 50 items list, $n = 1$)

> *Note: This scorecard summarizes the diagnostic k6 test on route `/` (SSG). Full multi-route benchmarks across dynamic and streaming routes (`/items/42`, `/dashboard`, `/ppr`, `/messages`) are conducted separately via Autocannon.*

| Diagnostic Metric | Dinou 9.0.0 | Next.js 16.4.2 | Comparison |
| :--- | :--- | :--- | :--- |
| **Throughput (200 VUs, 30s)** | **1,441.6 req/s** | 771.3 req/s | **Dinou +86.9% (1.87× faster)** |
| **Total Completed Requests (30s)** | **43,453** | 23,320 | **Dinou +86.3% more requests** |
| **Mean Latency (`avg`)** | **138.2 ms** | 257.8 ms | **Dinou 46.4% lower latency** |
| **Median Latency (`p50`)** | **127.5 ms** | 197.6 ms | **Dinou 35.5% lower latency** |
| **95th Percentile Latency (`p95`)** | **141.2 ms** | 261.1 ms | **Dinou 45.9% lower latency (1.85×)** |
| **Total Data Transferred** | ~1.2 GB | ~1.7 GB | Next transferred 41% more data |
| **Average Payload per Request** | **~28 KB** | ~73 KB | Next is ≈ 2.6× larger |
| **HTTP Checks Passed (200 OK)** | **100.00% (43,453 / 43,453)** | **100.00% (23,320 / 23,320)** | Both 100% reliable under k6 |
| **Requests > 1.0s during steady state** | **0** | **0** | Both completely stable after burst |
| **Max Latency (Cold Burst Artifact)** | **13.76 s** *(13.77s in log)* | 25.74 s | Next took 1.87× longer to drain burst |

---

### Supplementary Project Metrics (Full Benchmark Suite)

> *Measurements from the broader benchmark suite across all routes and build runs:*

| Project Metric | Dinou 9.0.0 | Next.js 16.4.2 | Comparison |
| :--- | :--- | :--- | :--- |
| **Build Duration (4 vCPU / 8 GB)** | **4.6 s** | 10.0–11.3 s (range) | **Dinou 2.2–2.5× faster build** |
| **Client Bundle Size (Brotli)** | **76.9 KiB** | 149.0 KiB | **Dinou 48% smaller client JS** |
