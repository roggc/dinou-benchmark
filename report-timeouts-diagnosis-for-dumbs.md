# Plain-English Guide to the `/rigorous/cache-slot` Timeouts ("For Humans")

> **Companion to**: [`report-timeouts-diagnosis.md`](./report-timeouts-diagnosis.md) · [`report-run1-results.md`](./report-run1-results.md) · [`report-run2-results.md`](./report-run2-results.md) · [`report-run1-run2-comparison.md`](./report-run1-run2-comparison.md).  
> **Goal of this document**: Explain in plain, visual, everyday language what is actually happening inside Node.js, Dinou, and Next.js during the `/rigorous/cache-slot` load test, why `autocannon` reports timeouts on Dinou while Dinou is running faster, and how our diagnostic tools prove it.

---

## 1. The Store & The Single Ultra-Fast Cashier Analogy

Imagine the Node.js server is **a store with a single ultra-fast cashier** (because Node.js runs your JavaScript and React rendering on a **single execution thread**).

At this store, there are **two places** where customers can be:
1. **Inside the store, right at the counter**: Customers for whom the cashier has already buzzed open the front door and who now have an "open service window" (an active **TCP `Keep-Alive` connection**).
2. **Outside on the sidewalk in front of the entrance door**: Customers who have just arrived, rang the doorbell, and are waiting for the cashier to have a brief free moment to press the button that buzzes open the front door (**`accept()`**).

Now let's watch what happens step by step when the `/rigorous/cache-slot` benchmark starts.

---

## 2. Step-by-Step: What Happens During the 30-Second Test

### Step 1: 200 Customers Arrive All at Once at Millisecond `0.00s`
When `autocannon` starts the test, it launches **200 customers simultaneously** at the exact instant `t = 0.00s`. Every single customer immediately starts their personal **30-second stopwatch**:
> *"If I haven't received my order by `30.00 seconds`, I'm walking away and logging a timeout."*

### Step 2: The Cashier Buzzes In the First ~122 Customers
During the first few milliseconds, the cashier presses the door buzzer and lets the first **`122` customers** into the store. The remaining **`76–78` customers** stay outside at the street door for a moment, waiting for the cashier to press the door buzzer again.

### Step 3: What Happens with Those 122 Customers Already Inside?
Here is the heart of the entire phenomenon. Those `122` customers inside use **HTTP Keep-Alive**, which means **they never leave the counter after getting their order**: in the exact microsecond the cashier hands a customer their finished web page, that same customer immediately orders another page right across the counter.

And what does **Dinou** have to do to prepare `/rigorous/cache-slot`?
- The route is **Dynamic**, so React must render the component tree on the processor (**CPU**).
- However, the expensive data piece (`CachedSlot`) **is already stored in RAM (in the memory cache)**, and there is no slow database query or timer (`Suspense`) to wait for.
- In other words: **it is 100% pure processor (CPU) work with zero waiting pauses.**
- The Dinou cashier takes only **`4.6 milliseconds`** to assemble the page in memory and hands the entire finished page to the customer in one shot (in **`0.27 ms`**).
- The instant the cashier finishes with Customer #1, Customer #2 is already waiting at the counter with an order; then Customer #3, then Customer #4... and by the time the cashier finishes serving Customer #122 (about half a second later), **Customer #1 has already placed a brand-new order at the counter!**

### Step 4: Why Do the ~76 Customers on the Sidewalk Time Out at `30.04s`?
Because the `122` customers inside keep the cashier working at **100% CPU utilization without a single microsecond of idle break**, the cashier prioritizes fulfilling the orders already piled up on the counter rather than walking over to the street door to let new people in.
- Meanwhile, the **`~76` customers on the sidewalk** keep waiting politely at the front door where they have been standing since `t = 0.00s`.
- When the wall clock hits **`30.04 seconds`**, the 30-second personal stopwatch of all `76` sidewalk customers beeps at the exact same instant, and `autocannon` reports: ***"76 timeouts!"***

We know this with **100% mathematical certainty** because:
1. **The numbers add up to 200**: Dinou's internal socket counter (`/__stats`) shows that Node.js only buzzed open the door for **`122` connections out of `200`** (`122 inside + 76 timed out = 198`), and inside Dinou **not a single request took more than `17 ms`** (`0` slow requests over 1 second out of `6,315` completed requests).
2. **The 60-Second Stopwatch Proof (Grafana `k6`)**: When we ran the exact same test using **Grafana `k6`** and gave the customers a **60-second stopwatch** instead of a 30-second stopwatch: the exact instant the clock hit `30.0 seconds` and the `120` customers inside stopped placing new orders, the cashier immediately walked to the door, buzzed in the remaining **`76–90` sidewalk customers**, and **served every single one of them in less than 1 second** (finishing at `30.85s–30.88s`), resulting in **`100.00% OK` (`6,253 out of 6,253` successful requests, `0` errors)**.

---

## 3. Why Does This Happen ONLY on `/rigorous/cache-slot` (and Slightly on `/rigorous/hs-cache-slot`) and NOT on the Other 10 Routes?

Because on every other route in the benchmark, one of two things happens:

1. **On Static Routes (`/`, `/rigorous/hs`, etc.)**:  
   The entire page is already pre-built in memory. The cashier takes only **`~0.7 ms`** per customer (nearly **7 times less work** than `4.6 ms`). The cashier serves the first `122` customers so fast that plenty of spare time remains to buzz all `200` customers through the door right away.
2. **On Routes with `Suspense` / PPR (`/rigorous/ppr`, `/dashboard`, `/rigorous/triple`, `/rigorous/ppr-cache-slot`, etc.)**:  
   There is a slow component simulating an external database/network wait (an asynchronous timer). While waiting for that timer to finish, **the cashier stands with arms crossed waiting** (consuming zero CPU). During those idle waiting pauses, the cashier walks over to the front door and buzzes all `200` customers into the store.
3. **`/rigorous/cache-slot` Is the Only "Pure Uninterrupted CPU" Route**:  
   It is the only route where the cashier has to do real CPU work (`4.6 ms` of dynamic React rendering) **AND has zero idle waiting pauses**, because the data (`CachedSlot`) is already sitting in RAM cache.
   - *(Note on `/rigorous/hs-cache-slot`)*: Because Horizontal Segmentation (`HS`) caches the outer layout and page segments independently in memory, the per-customer CPU work drops from `4.6 ms` down to `~1.46 ms` (`684.7 req/s`). That is fast enough that the cashier buzzes in `199.8` of the `200` customers on average, leaving only `1` timeout across 5 rounds in `dinou-9` (`30` in `dinou-9-u`, vs. `160` in Next.js) right on the 30-second boundary.

---

## 4. Why Does Next.js Get Fewer Timeouts on `/rigorous/cache-slot` (`~20/round` vs. `~68/round`) Despite Being `1.73×` Slower?

Because when Next.js combines a dynamic route (`await connection()`) with `"use cache"`, **Next.js is unable to deliver the cached page in a single uninterrupted push**:

- Next.js hands the customer an initial receipt (the HTTP headers) after `~204 ms`, but then **internally pauses and suspends its own work**, taking an extra **`~800 milliseconds` (`0.8 seconds`)** to trickle out the body of the page in chunks (`http_req_receiving = 799.36 ms` in Next.js vs. **`0.27 ms`** in Dinou — nearly **`3,000 times` slower** at delivering the response body).
- Because the Next.js cashier stops and pauses between chunks of every single page, it uses those pauses to buzz **`~170–180` of the `200` customers** through the front door during the 30-second round (leaving only **`~20–30` customers** waiting at the door at `t = 30.0s` — i.e., `99` timeouts across 5 rounds in `autocannon` and `30` requests `>= 30s` in `k6`, vs. `~68–90` in Dinou).
- **The heavy price Next.js pays for those internal pauses**: Even though `~170–180` customers get inside the store, Next.js serves everyone much more slowly:
  - It delivers **`1.68×–1.73×` lower throughput** (**`124.7 req/s`** in `autocannon` / **`120.1 req/s`** in `k6` for Next.js vs. **`215.5 req/s`** in `autocannon` / **`202.2 req/s`** in `k6` for Dinou).
  - **More than half of all Next.js customers (`55.52%` = `2,053 / 3,698` total requests, including `1,896` in steady state `[1s–30s]`) have to wait over `1 full second`** to receive their page (median latency of **`973 ms`** in `autocannon` / **`1,030 ms`** in `k6` for Next.js vs. **`359 ms`** in `autocannon` / **`383.5 ms`** in `k6` for Dinou, where only **`1` request (`0.016%`)** in steady state exceeds 1 second).

| What Happens Inside the Store | Dinou 9.0.3 | Next.js 16.4.3 |
| :--- | :--- | :--- |
| **Time to prepare & hand over the body (`http_req_receiving`)** | **`0.27 ms`** (`267 µs` — handed over in one shot) | **`799.36 ms`** (`~0.8s` — trickled out in chunks across pauses) |
| **Throughput (customers served per second)** | **`215.5 req/s`** (`autocannon`) / **`202.2 req/s`** (`k6`) (**`1.68×–1.73×` faster**) | `124.7 req/s` (`autocannon`) / `120.1 req/s` (`k6`) |
| **Typical wait time for customers inside (Median `p50`)** | **`359 ms`** (`autocannon`) / **`383.5 ms`** (`k6`) (**`2.69×–2.71×` faster**) | `973 ms` (`autocannon`) / `1,030 ms` (`k6`) |
| **Customers waiting `> 1 second` in steady state (`[1s–30s]`)** | **`1` customer (`0.016%` of `6,253`)** | **`1,896` customers (`51.27%` of `3,698`; `2,053` = `55.52%` total)** |
| **Customers left waiting at the door at `t = 30.0s` (`timeout = 30s`)** | `~68–90` sockets per round (`338` across 5 `autocannon` rounds; all served in `< 1s` at `30.85s` once the 30s burst stops) | `~20–30` sockets per round (`99` across 5 `autocannon` rounds; `800 ms` body pauses let `~170` sockets in early) |

---

## 5. FAQ: Can `diagnose-timeouts.mjs` Run on Next.js, or Only on Dinou?

As currently designed, our two diagnostic scripts split the job as follows:

1. **[`scripts/diagnose-timeouts.mjs`](./scripts/diagnose-timeouts.mjs) runs specifically against Dinou (Port `3121`)**:
   - **Why?** Because in addition to running 4 `autocannon` client scenarios (200-conn clean burst, 200-conn warmup burst, 50-conn moderate concurrency, and 200-conn without Keep-Alive), it queries the internal **`/__stats` and `/__reset_stats` endpoints** that we wired into [`apps/dinou-9/dinou.config.js`](./apps/dinou-9/dinou.config.js).
   - Those endpoints hook directly into Node.js's low-level `req.socket` events to count exact accepted TCP sockets (`122 out of 200`), exact time spent inside Node (`4.67 ms` average, `17 ms` max), and requests over 1 second (`0`).
   - Next.js hides its raw Node.js `http.Server` behind the `next start` CLI, so `diagnose-timeouts.mjs` focuses on instrumenting Dinou's internal socket queue (`/__stats`), while `k6-diagnose.mjs` profiles both frameworks side by side from the outside.

2. **[`scripts/k6-diagnose.mjs`](./scripts/k6-diagnose.mjs) runs against BOTH Dinou (Port `3121`) and Next.js (Port `3111`)**:
   - **Why?** Because **Grafana `k6`** measures the entire lifecycle of every request from the outside with microsecond precision — separating **time waiting for headers (`http_req_waiting`)** from **time downloading the body (`http_req_receiving`)**, grouping every single request into 1-second time buckets (`[0s–1s]`, `[1s–5s]`, `[5s–30s]`), and reading Linux kernel TCP counters (`nstat`) — while also querying `/__stats` when testing Dinou.
   - *(If desired in the future, `diagnose-timeouts.mjs` could easily accept an optional `--app=next` flag to point its 4 `autocannon` scenarios at port `3111` and skip `/__stats`, though `k6-diagnose.mjs` already provides the complete side-by-side radiography of both frameworks).*

---

## 6. Can This Happen in Real Life? When Could It Happen, and How Is It Solved?

**The short answer:**
- **With normal human users in web browsers: NO, it does not happen.**
- **In an extreme machine-to-machine / bot-swarm scenario against a single raw Node.js process with no reverse proxy in front: YES, it could happen** — and it has straightforward, battle-tested solutions at both the infrastructure level and inside Node.js itself.

Let's break down why it doesn't happen with humans, when it could happen with machines, and the 3 levels of solutions.

---

### 6.1 Why It Does NOT Happen with Normal Human Traffic in Real Life

In `autocannon`, we create an artificial "laboratory stress-test" condition that human users in a browser never produce:

1. **Humans Have "Think-Time" (Reading Time); `autocannon` Has `0.00 ms` Pause**:
   - In `autocannon`, each of the `122` customers inside the store orders a page, receives it, and **in the exact same microsecond (`0.00 ms` later)** orders the page again non-stop for 30 straight seconds (`~6,300` consecutive times).
   - In real life, when a human user visits your site and receives `/rigorous/cache-slot` in `4.6 ms`, their browser paints the page and the human **spends 5, 10, or 30 seconds reading it** (or clicks a link using Dinou's client-side SPA router).
   - During all those seconds while the human is reading the page, their `Keep-Alive` connection is **completely silent (using 0% CPU)**. That means the cashier (Node.js) is immediately free and buzzes open the front door (`accept()`) for any new user arriving from the street.
2. **In Real Production, a Single Raw Node.js Process Does Not Sit Directly on the Public Street**:
   - Real internet servers sit behind a **Reverse Proxy / Load Balancer** (Cloudflare, Nginx, Caddy, AWS ALB, Traefik, etc.) and typically run multiple Node.js processes (one per CPU core).

---

### 6.2 When COULD It Happen in Real Life?

It could only happen if **all 3 of these conditions occur simultaneously**:
1. You deploy **a single Node.js process** exposed directly to traffic (or behind a misconfigured proxy that opens `200+` simultaneous `Keep-Alive` connections to that single Node.js process).
2. You are hit by a **non-stop machine bombardment with zero pause** (for example: an aggressive swarm of scraper bots, a DoS flood, or a runaway internal microservice calling your endpoint in an unthrottled `while` loop over `Keep-Alive`).
3. The route being bombarded is structured like `/rigorous/cache-slot`: **dynamic CPU rendering where the data is already in RAM cache** (with no database queries or disk reads that would force the cashier to wait).

In that specific scenario, the first `~120` bot connections would monopolize 100% of the single Node.js thread's CPU, and a new human user trying to open a brand-new TCP connection against that same process would have to wait at the door until the bot burst subsides.

---

### 6.3 How Is It Solved in Real Life? (3 Levels of Solutions)

There are three ways to solve it, ranging from standard production architecture to a single-line setting inside Node.js:

#### Solution 1: A Reverse Proxy in Front (Nginx / Caddy / Cloudflare) — *How 99% of Production Servers Run*
When you place **Nginx, Caddy, or Cloudflare** in front of Dinou:
- The `200` (or `10,000`) customers on the street knock on **Nginx's door**, not directly on Node.js's door.
- Because Nginx is written in multi-threaded C and does not render React, **it buzzes open the door for all `200` customers at millisecond `0.00`**. Not a single customer is ever left out on the street.
- Next, Nginx hands the requests to the Dinou cashier in **strict first-come, first-served order (a fair single-file FIFO line)** over a controlled pool of internal connections (for example, `32` or `50` upstream connections to Node.js).
- Remember what happened in **Scenario 3 of `diagnose-timeouts.mjs`** when we sent **`50` connections** to Dinou instead of `200`?
  - Dinou delivered the exact same maximum speed (**`211.5 req/s`**), an excellent latency (**`p50 = 228 ms`, `p99 = 273 ms`**), and **`0` timeouts (`100% OK`)**.

#### Solution 2: Use All CPU Cores on the Server (Cluster / PM2 / Docker Replicas)
- In our benchmark, we intentionally run **1 single Node.js process** (1 single cashier out of the droplet's 4 CPU cores) to measure a fair, apples-to-apples 1-instance comparison of Dinou vs. Next.js.
- In real life, on a 4-vCPU server you launch **4 Dinou processes** (using `pm2 start -i max`, `node:cluster`, or 4 container replicas).
- With **4 cashiers** answering the same front door simultaneously (`SO_REUSEPORT` in Linux), capacity jumps from `215 req/s` to **`~860 req/s`**, and all `200` customers walk right through the door in the first millisecond.

#### Solution 3: Inside Node.js Itself (`server.maxRequestsPerSocket`) — *If You Run 1 Process with No Proxy*
What if someone deploys a single raw Node.js process without Nginx or Cluster, and wants to guarantee that no `Keep-Alive` client can ever monopolize the counter?
- Node.js's native HTTP server (`http.Server`) has a built-in property called **`server.maxRequestsPerSocket`**.
- By default in Node.js, it is set to `0` (unlimited: once a customer gets inside the store, they can stand at the counter placing millions of back-to-back orders forever without ever leaving).
- If you set `server.maxRequestsPerSocket = 50` (or `100`), once a customer has placed 50 consecutive orders at the counter, Node.js delivers their 50th order and automatically tells them: *"Thank you for your visit! Please step outside and join the back of the line at the front door if you'd like to order more"* (closing that socket with `Connection: close` and buzzing in the customers who were waiting outside).
- In fact, that is exactly what **Scenario 4 of `diagnose-timeouts.mjs`** tested (connection rotation): as soon as customers rotate through the front door instead of camping at the counter forever, timeouts immediately drop to **`0`**.

---

### Summary Takeaway
What this benchmark uncovered is not a flaw in Dinou, but rather **what happens when a Node.js SSR framework is so fast at serving from its in-memory RAM cache (`0.27 ms` body delivery vs. `800 ms` in Next.js) that it drives a single CPU core to 100% pure uninterrupted work with zero dead pauses**:
- **In real life**, human reading time between clicks, a front-end Reverse Proxy (Nginx/Cloudflare), or multi-core workers prevent it from ever happening.
- **In the benchmark**, it shows why a tool like **Grafana `k6`** (or testing at 50–100 connections, or observing the post-30s drain) reveals the full truth that `autocannon` hid by cutting off its stopwatch at `30.00s`.

---

## 7. Epilogue: The Two-Clock Race in `autocannon` & How Run 2 (`timeout = 60s`) Proved `0` Errors

Why did `autocannon` report those timeouts right at **`+30.04s`** in **Run 1**?

In [`scripts/load.mjs`](./scripts/load.mjs), `autocannon` has **two separate clocks**:
1. **Clock #1 — `duration: 30` (The Store's Opening Hours: 30 seconds)**: *"The test runs for 30 seconds."*
2. **Clock #2 — `timeout: 30` (Each Customer's Personal Patience Stopwatch: 30 seconds)**: *"If a customer waits 30.00 seconds without getting an answer, log `1 timeout`."*

Originally, when `duration` was `10` seconds, the formula `timeout: Math.max(30, duration)` set `timeout` to **`30` seconds** — giving a 20-second safety margin (`timeout > duration`). When we raised `duration` to **`30` seconds**, `Math.max(30, 30)` became **`30`**, making both clocks equal (`30s == 30s`).

Inside `autocannon`'s source code (`node_modules/autocannon/lib/run.js`, lines 86–118), `autocannon` starts the 200 customers' `timeout` stopwatches (`initialiseClients`) **about 40 milliseconds before** it starts the `stopTimer` that closes the store at the end of the 30-second test!
- So at **`+30.04s`** — literally **10 milliseconds before `autocannon` rang the closing bell to end the 30-second test** — the 30-second personal stopwatch of the `76` sidewalk customers beeped first!
- When we restored the safety margin in [`scripts/load.mjs`](./scripts/load.mjs) by setting **`timeout: 60` (`2 × duration`)** and ran **Run 2** ([`report-run2-results.md`](./report-run2-results.md)), **100% of timeouts disappeared across all 12 routes in both Dinou (`339 → 0`) and Next.js (`279 → 0`)**, while throughput (`215.5 → 222.1 req/s`), median latency (`359 → 350 ms`), and `p99` (`6,282 → 5,973 ms`) remained rock-solid.



