#!/usr/bin/env node
/**
 * Functional & Rigorous 3D Caching Verification:
 * Checks that all apps pass both the baseline benchmark checks and the 7
 * rigorous suites (Horizontal Segmentation, Cache-Slot, PPR, Pairwise Synergies,
 * and Triple Synergy).
 *
 * Usage: node scripts/verify.mjs [--only=dinou-9] [--skip-build]
 */
import { cp } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { ROOT, setup, frameworks as allFrameworks, selectedFrameworks } from "./config.mjs";
import { startServer, timedFetch, writeJson, readJson, round } from "./lib.mjs";

const skipBuild = process.argv.includes("--skip-build");
const frameworks = selectedFrameworks();
const results = [];

async function resetMessages(app) {
  await cp(
    path.join(ROOT, "shared/data/messages.json"),
    path.join(ROOT, app.dir, "data/messages.json")
  );
}

async function check(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    return { name, ok: true, ms: Date.now() - started, detail: detail ?? "" };
  } catch (error) {
    return { name, ok: false, ms: Date.now() - started, detail: error.message };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countOccurrences(haystack, needle) {
  return haystack.split(needle).length - 1;
}

async function waitForText(page, selector, expected, timeout = 12_000) {
  const target = String(expected);
  try {
    await page.waitForFunction(
      ({ sel, exp }) => {
        const el = document.querySelector(sel);
        return el && (el.textContent ?? "").trim() === exp;
      },
      { sel: selector, exp: target },
      { timeout }
    );
  } catch (err) {
    let actual = "<missing>";
    try {
      actual = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return el ? (el.textContent ?? "").trim() : "<missing>";
      }, selector);
    } catch {}
    throw new Error(`waitForText(${selector} === "${target}") timed out (actual="${actual}"): ${err.message}`);
  }
}

async function readText(page, selector) {
  await page.waitForSelector(selector, { timeout: 12_000 });
  const raw = await page.textContent(selector);
  return (raw ?? "").trim();
}

for (const fw of frameworks) {
  console.log(`\n=== ${fw.name} ${fw.version} (${fw.dir}) ===`);
  const cwd = path.join(ROOT, fw.dir);

  if (!skipBuild) {
    const { runCommand } = await import("./lib.mjs");
    const build = await runCommand({
      cwd,
      cmd: "pnpm",
      args: ["run", "build"],
      timeoutMs: 900_000,
    });
    if (build.code !== 0) {
      console.error(build.stdout.slice(-3000), build.stderr.slice(-3000));
      throw new Error(`build failed for ${fw.name}`);
    }
    console.log(`build ok in ${round(build.ms / 1000, 1)} s`);
  }

  await resetMessages(fw);

  const server = await startServer({
    cwd,
    cmd: "pnpm",
    args: ["run", "start"],
    port: fw.port,
    readyPath: "/",
    timeoutMs: 180_000,
  });

  const base = server.url;
  const checks = [];
  const token = `ping-${fw.id}-${Date.now().toString(36)}`;

  // --- Baseline Checks (1–12) ---
  checks.push(
    await check("ssg: / responds 200", async () => {
      const res = await timedFetch(`${base}/`);
      assert(res.status === 200, `status ${res.status}`);
      return `${round(res.totalMs)} ms`;
    })
  );

  checks.push(
    await check("ssg: / 50 items listing", async () => {
      const { body } = await timedFetch(`${base}/`);
      const n = countOccurrences(body, 'data-item-id="');
      assert(n === 50, `found ${n} items, expected 50`);
      return `${n} items`;
    })
  );

  checks.push(
    await check("ssg: stable HTML across requests", async () => {
      const runs = [];
      for (let i = 0; i < setup.thresholds.staticStabilityRuns; i += 1) {
        runs.push((await timedFetch(`${base}/`)).body);
      }
      assert(new Set(runs).size === 1, "HTML changes between requests");
      return `${runs.length} identical requests`;
    })
  );

  checks.push(
    await check("isr: /items/1 responds 200", async () => {
      const res = await timedFetch(`${base}/items/1`);
      assert(res.status === 200, `status ${res.status}`);
      return `${round(res.totalMs)} ms`;
    })
  );

  checks.push(
    await check("isr: cached and stable HTML", async () => {
      const a = await timedFetch(`${base}/items/1`);
      const b = await timedFetch(`${base}/items/1`);
      assert(a.body === b.body, "HTML changes within 60s window");
      assert(a.body.includes('data-testid="item-stamp"'), "missing render timestamp");
      return "2 identical requests";
    })
  );

  checks.push(
    await check("isr: prerendered route /items/42", async () => {
      const res = await timedFetch(`${base}/items/42`);
      assert(res.status === 200, `status ${res.status}`);
      assert(/Resource 042/.test(res.body), "does not contain item 42");
      return "correct content";
    })
  );

  checks.push(
    await check("404: nonexistent & validateParams/allowISG routes", async () => {
      const statuses = [];
      for (const p of setup.notFoundPaths) {
        const res = await timedFetch(`${base}${p}`);
        statuses.push(`${p}=${res.status}`);
        assert(res.status === 404, `${p} returned ${res.status}`);
      }
      return statuses.join(" ");
    })
  );

  checks.push(
    await check("dashboard: responds 200", async () => {
      const res = await timedFetch(`${base}/dashboard`);
      assert(res.status === 200, `status ${res.status}`);
      return `${round(res.totalMs)} ms`;
    })
  );

  checks.push(
    await check("dashboard: is dynamic (two requests differ)", async () => {
      const a = await timedFetch(`${base}/dashboard`);
      const b = await timedFetch(`${base}/dashboard`);
      assert(a.body !== b.body, "HTML is identical: response is being cached");
      return "different timestamps";
    })
  );

  checks.push(
    await check("dashboard: streams 3 holes after fallback", async () => {
      const res = await timedFetch(`${base}/dashboard`);
      const fallbacks = countOccurrences(res.body, "data-skeleton=");
      const holes = countOccurrences(res.body, "data-hole=");
      assert(fallbacks >= 3, `fallbacks ${fallbacks}`);
      assert(holes >= 3, `resolved holes ${holes}`);
      assert(res.totalMs >= setup.holeDelayMs * 0.7, `too fast: ${res.totalMs}`);
      return `${fallbacks} fallbacks · ${holes} holes · ${round(res.totalMs)} ms`;
    })
  );

  let pprFirst = 0;
  let pprTotal = 0;
  checks.push(
    await check("ppr: static shell in first chunk", async () => {
      const res = await timedFetch(`${base}/ppr`);
      pprFirst = res.firstChunkMs;
      pprTotal = res.totalMs;
      assert(res.status === 200, `status ${res.status}`);
      assert(res.body.includes("ppr-shell-stamp"), "shell does not include stamp");
      assert(
        res.firstChunkMs < setup.thresholds.pprShellMs,
        `first chunk in ${round(res.firstChunkMs)} ms (threshold ${setup.thresholds.pprShellMs})`
      );
      return `first chunk ${round(res.firstChunkMs, 2)} ms`;
    })
  );

  checks.push(
    await check("ppr: hole arrives later (streaming)", async () => {
      const first = (await timedFetch(`${base}/ppr`)).firstChunkMs;
      const res = await timedFetch(`${base}/ppr`);
      pprFirst = res.firstChunkMs;
      pprTotal = res.totalMs;
      assert(res.body.includes('data-hole="live quote"'), "hole was not resolved");
      assert(
        res.totalMs - res.firstChunkMs >= setup.thresholds.pprHoleMs,
        `hole too fast: ${round(res.totalMs - res.firstChunkMs)} ms after shell`
      );
      assert(first < setup.thresholds.pprShellMs, `slow shell: ${round(first)} ms`);
      return `shell ${round(res.firstChunkMs, 2)} ms · total ${round(res.totalMs, 2)} ms`;
    })
  );

  // --- Browser E2E Checks (Baseline #13 + 7 Rigorous Suites) ---
  const browser = await chromium.launch();
  try {
    checks.push(
      await check("mutation: Server Function visible in browser", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/messages`, { waitUntil: "networkidle" });
          await page.fill('input[name="body"]', token);
          await page.click('[data-testid="submit"]');
          await page.waitForSelector('[data-testid="feedback"]', { timeout: 15_000 });
          const feedback = await page.textContent('[data-testid="feedback"]');
          assert(feedback && feedback.includes("Saved"), `feedback: ${feedback}`);
          await page.reload({ waitUntil: "networkidle" });
          const html = await page.content();
          assert(html.includes(token), "message does not appear after reload");
          return "persisted and rendered";
        } finally {
          await page.close();
        }
      })
    );

    // Suite 1: Horizontal Segmentation (/rigorous/hs)
    checks.push(
      await check("rigorous-hs: sibling soft nav preserves layout client state & mountId", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/hs`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await page.waitForFunction(
            () => (document.querySelector("#hs-l1-client-mount")?.textContent ?? "").startsWith("m-")
          );
          const l1Mount0 = await readText(page, "#hs-l1-client-mount");
          await page.click("#hs-l1-client-btn");
          await waitForText(page, "#hs-l1-client-count", "1");

          const rscLayoutRequests = [];
          page.on("request", (req) => {
            if (req.url().includes("____rsc_layout____")) rscLayoutRequests.push(req.url());
          });

          await page.click('[data-testid="nav-sibling-a"]');
          await waitForText(page, "#hs-sibling-a-seq", "100");
          const l1Mount1 = await readText(page, "#hs-l1-client-mount");
          const l1Count1 = await readText(page, "#hs-l1-client-count");
          assert(l1Mount1 === l1Mount0, `L1 remounted: ${l1Mount0} -> ${l1Mount1}`);
          assert(l1Count1 === "1", `L1 count lost: ${l1Count1}`);
          if (fw.id.startsWith("dinou")) {
            assert(rscLayoutRequests.length === 0, `unexpected layout fetches: ${rscLayoutRequests.length}`);
          }
          return `mountId=${l1Mount0} preserved · layoutFetches=${rscLayoutRequests.length}`;
        } finally {
          await page.close();
        }
      })
    );

    checks.push(
      await check("rigorous-hs: nested L2 layout, @badge slot, dynamic [deptId], locked [code] & escape hatches", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/hs/nested`, { waitUntil: "networkidle" });
          await waitForText(page, "#hs-l2-seq", "100");
          await waitForText(page, "#hs-badge-slot-seq", "100");
          await waitForText(page, "#hs-nested-page1-seq", "100");

          await page.waitForFunction(
            () => (document.querySelector("#hs-l2-client-mount")?.textContent ?? "").startsWith("m-")
          );
          const l2Mount0 = await readText(page, "#hs-l2-client-mount");
          await page.click('[data-testid="nav-nested-p2"]');
          await waitForText(page, "#hs-nested-page2-seq", "100");
          const l2Mount1 = await readText(page, "#hs-l2-client-mount");
          assert(l2Mount1 === l2Mount0, `L2 remounted on nested sibling nav`);

          await page.click('[data-testid="nav-dept-eng"]');
          await waitForText(page, "#hs-dept-param", "eng");
          await waitForText(page, "#hs-dept-page-param", "eng");

          await page.click('[data-testid="nav-locked-alpha"]');
          await waitForText(page, "#hs-locked-code", "alpha");

          await page.goto(`${base}/rigorous/hs/reset-branch`, { waitUntil: "networkidle" });
          await waitForText(page, "#hs-reset-layout-seq", "100");
          assert((await page.$("#hs-l1-layout")) === null, "reset-branch should not render #hs-l1-layout");

          await page.goto(`${base}/rigorous/hs/no-layout-page`, { waitUntil: "networkidle" });
          await waitForText(page, "#hs-no-layout-seq", "100");
          assert((await page.$("#hs-l1-layout")) === null, "no-layout-page should not render #hs-l1-layout");
          return "L2 + @badge + [deptId] + [code] + reset_layout + no_layout OK";
        } finally {
          await page.close();
        }
      })
    );

    checks.push(
      await check("rigorous-hs: surgical revalidatePage vs revalidateLayout & lazy HTML re-composition", async () => {
        const page = await browser.newPage();
        const hydrationErrors = [];
        page.on("console", (msg) => {
          if (msg.type() === "error" && /hydrat/i.test(msg.text())) {
            hydrationErrors.push(msg.text());
          }
        });
        try {
          await page.goto(`${base}/rigorous/hs/sibling-b`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          // 1. Mutate both layout and sibling-b, then revalidate ONLY page
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hsL1LayoutSeq: 101,
              hsSiblingBSeq: 101,
            });
            await window.__BENCH_RIGOROUS__.revalidatePage("/rigorous/hs/sibling-b");
            window.__BENCH_RIGOROUS__.refreshPage();
          });
          await waitForText(page, "#hs-sibling-b-seq", "101");
          assert((await readText(page, "#hs-l1-seq")) === "100", "layout should remain 100 on revalidatePage");

          // 2. Mutate layout=102 and sibling-b=999, then revalidate ONLY layout
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hsL1LayoutSeq: 102,
              hsSiblingBSeq: 999,
            });
            await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/hs");
          });

          // Hard reload (F5) tests lazy index.html re-composition (layout=102 + cached page=101)
          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#hs-l1-seq", "102");
          await waitForText(page, "#hs-sibling-b-seq", "101");
          assert(hydrationErrors.length === 0, `hydration errors: ${hydrationErrors.join("; ")}`);

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/hs");
              await window.__BENCH_RIGOROUS__.revalidatePage("/rigorous/hs/sibling-b");
            }
          });
          return "page=101 preserved · layout=102 recomposed · 0 hydration errors";
        } finally {
          await page.close();
        }
      })
    );

    // Suite 2: Cache-Slot (/rigorous/cache-slot)
    checks.push(
      await check("rigorous-cache-slot: dynamic bypass, surgical slot refresh, shared tag, nested slots & server action prop", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/cache-slot`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          // Verify "use server" action prop inside cached slot
          await page.click("#cs-alpha-widget-btn");
          await waitForText(page, "#cs-alpha-widget-count", "1");
          await page.click("#cs-alpha-widget-ping");
          await page.waitForFunction(
            () => (document.querySelector("#cs-alpha-widget-pong")?.textContent ?? "").startsWith("pong:cs-alpha-widget:")
          );

          // Mutate state without revalidating tags: dynamic host & revalidate=0 slot update immediately
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              csDynamicHostSeq: 110,
              csNoCacheSeq: 110,
              csAlphaSeq: 110,
              csBetaSeq: 110,
              csGammaSeq: 110,
              csNestedOuterSeq: 110,
              csNestedInnerSeq: 110,
            });
            window.__BENCH_RIGOROUS__.refreshPage();
          });
          await waitForText(page, "#cs-dynamic-host-seq", "110");
          await waitForText(page, "#cs-nocache-seq", "110");
          assert((await readText(page, "#cs-alpha-seq")) === "100", "alpha slot should remain cached at 100");
          assert((await readText(page, "#cs-beta-seq")) === "100", "beta slot should remain cached at 100");

          // Surgical refreshSlot("cs-slot-alpha", true) preserves client widget state
          await page.evaluate(() => window.__BENCH_RIGOROUS__.refreshSlot("cs-slot-alpha", true));
          await waitForText(page, "#cs-alpha-seq", "110");
          assert((await readText(page, "#cs-alpha-widget-count")) === "1", "widget local state preserved");
          assert((await readText(page, "#cs-beta-seq")) === "100", "beta slot untouched");

          // Shared tag invalidates both beta & gamma simultaneously
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-shared");
            await window.__BENCH_RIGOROUS__.refreshSlot("cs-tag-shared", false);
          });
          await waitForText(page, "#cs-beta-seq", "110");
          await waitForText(page, "#cs-gamma-seq", "110");

          // Nested inner slot invalidation keeps outer slot cached at 100
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-nested-inner");
            await window.__BENCH_RIGOROUS__.refreshSlot("cs-slot-nested-inner", false);
          });
          await waitForText(page, "#cs-nested-inner-seq", "110");
          assert((await readText(page, "#cs-nested-outer-seq")) === "100", "nested outer slot should stay 100");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-alpha");
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-shared");
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-nested-inner");
            }
          });
          return "alpha/shared/nested slots + server action prop OK";
        } finally {
          await page.close();
        }
      })
    );

    // Suite 3: Rigorous PPR (/rigorous/ppr)
    checks.push(
      await check("rigorous-ppr: static shell, collapsed static Suspense, concurrent holes, inherited/opt-out & XSS guard", async () => {
        const res = await timedFetch(`${base}/rigorous/ppr?theme=cyber`);
        assert(res.status === 200, `status ${res.status}`);
        assert(res.body.includes('id="ppr-rig-shell-seq"'), "missing static shell seq");
        assert(res.body.includes('id="ppr-rig-static-suspense-seq"'), "missing static suspense seq");

        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/ppr?theme=cyber`, { waitUntil: "networkidle" });
          await waitForText(page, "#ppr-rig-shell-seq", "100");
          await waitForText(page, "#ppr-rig-static-suspense-seq", "100");
          await waitForText(page, "#ppr-hole-query-theme", "cyber");
          await waitForText(page, "#ppr-outer-static-val", "100");
          await waitForText(page, "#ppr-inner-dynamic-val", "100");
          await waitForText(page, "#ppr-deep-inner-val", "100");
          await waitForText(page, "#ppr-hole-memo-val", "100");

          const xssTriggered = await page.evaluate(() => Boolean(window.__XSS_PPR));
          assert(!xssTriggered, "XSS guard failed: script executed");

          await page.goto(`${base}/rigorous/ppr/inherited`, { waitUntil: "networkidle" });
          await waitForText(page, "#ppr-inherited-shell-seq", "100");
          await waitForText(page, "#ppr-inherited-hole-seq", "100");

          await page.goto(`${base}/rigorous/ppr/inherited/opt-out`, { waitUntil: "networkidle" });
          await waitForText(page, "#ppr-optout-seq", "100");
          return `shell ${round(res.firstChunkMs, 2)} ms · total ${round(res.totalMs, 2)} ms · XSS safe`;
        } finally {
          await page.close();
        }
      })
    );

    // Suite 4: Pairwise Synergy #1 — PPR + Cache-Slot (/rigorous/ppr-cache-slot)
    checks.push(
      await check("rigorous-ppr-cache-slot: shell slots vs dynamic hole slots & nested hole slot isolation", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/ppr-cache-slot`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await waitForText(page, "#syn-shell-seq", "100");
          await waitForText(page, "#syn-shell-slot-seq", "100");
          await waitForText(page, "#syn-hole-slot-a-seq", "100");
          await waitForText(page, "#syn-nested-outer-seq", "100");
          await waitForText(page, "#syn-nested-inner-seq", "100");

          // Mutate state and invalidate ONLY dynamic hole slot A + nested inner slot
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              synShellSeq: 999,
              synShellSlotSeq: 999,
              synHole1HostSeq: 120,
              synHoleSlotASeq: 120,
              synNestedOuterSeq: 999,
              synNestedInnerSeq: 120,
            });
            await window.__BENCH_RIGOROUS__.revalidateTag("syn-tag-hole-slot-a");
            await window.__BENCH_RIGOROUS__.revalidateTag("syn-tag-nested-inner");
          });

          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#syn-hole1-host-seq", "120");
          await waitForText(page, "#syn-hole-slot-a-seq", "120");
          await waitForText(page, "#syn-nested-inner-seq", "120");
          assert((await readText(page, "#syn-shell-seq")) === "100", "PPR shell should stay 100");
          assert((await readText(page, "#syn-shell-slot-seq")) === "100", "shell slot should stay 100");
          assert((await readText(page, "#syn-nested-outer-seq")) === "100", "nested outer hole slot should stay 100");

          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
          return "shell=100 · holeSlotA=120 · nestedInner=120";
        } finally {
          await page.close();
        }
      })
    );

    // Suite 5: Pairwise Synergy #2 — HS + Cache-Slot (/rigorous/hs-cache-slot)
    checks.push(
      await check("rigorous-hs-cache-slot: cross-axis shared tag, round-trip A->B->A slot persistence & LWW race", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/hs-cache-slot`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await waitForText(page, "#hscs-l1-host-seq", "100");
          await waitForText(page, "#hscs-page-a-host-seq", "100");
          await waitForText(page, "#hscs-page-a-slot-seq", "100");

          // 1. Cross-axis shared tag updates L1 shared slot + Page A shared slot while keeping hosts at 100
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hscsL1HostSeq: 999,
              hscsPageAHostSeq: 999,
              hscsL1SharedSeq: 130,
              hscsPageASharedSeq: 130,
              hscsPageASlotSeq: 131,
            });
            await window.__BENCH_RIGOROUS__.revalidateTag("hscs-tag-shared");
            await window.__BENCH_RIGOROUS__.refreshSlot("hscs-page-a-slot", true);
          });
          await waitForText(page, "#hscs-page-a-slot-seq", "131");
          assert((await readText(page, "#hscs-l1-host-seq")) === "100", "L1 host should stay 100");
          assert((await readText(page, "#hscs-page-a-host-seq")) === "100", "Page A host should stay 100");

          // 2. Round-trip soft navigation Page A -> Page B -> Page A preserves refreshed slot=131
          await page.click("#nav-hscs-page-b");
          await waitForText(page, "#hscs-page-b-host-seq", "100");
          await page.click("#nav-hscs-page-a");
          await waitForText(page, "#hscs-page-a-slot-seq", "131");

          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
          return "cross-axis shared tag + round-trip A->B->A slot=131 preserved";
        } finally {
          await page.close();
        }
      })
    );

    // Suite 6: Pairwise Synergy #3 — HS + PPR (/rigorous/hs-ppr)
    checks.push(
      await check("rigorous-hs-ppr: L1 PPR layout + @sidebar hole + PPR pages + surgical revalidateLayout/Page", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/hs-ppr?filter=active`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await waitForText(page, "#hsppr-l1-shell-seq", "100");
          await waitForText(page, "#hsppr-sidebar-shell-seq", "100");
          await waitForText(page, "#hsppr-page-a-shell-seq", "100");
          await waitForText(page, "#hsppr-page-a-hole1-filter", "active");

          // Revalidate Page A only: Page A shell updates to 140, L1 shell stays 100
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hspprL1ShellSeq: 999,
              hspprPageAShellSeq: 140,
            });
            await window.__BENCH_RIGOROUS__.revalidatePage("/rigorous/hs-ppr");
          });
          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#hsppr-page-a-shell-seq", "140");
          assert((await readText(page, "#hsppr-l1-shell-seq")) === "100", "L1 PPR shell should stay 100");

          // Revalidate Layout only: L1 shell updates to 141, Page A shell stays 140
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hspprL1ShellSeq: 141,
              hspprPageAShellSeq: 888,
            });
            await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/hs-ppr");
          });
          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#hsppr-l1-shell-seq", "141");
          assert((await readText(page, "#hsppr-page-a-shell-seq")) === "140", "Page A PPR shell should stay 140");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/hs-ppr");
              await window.__BENCH_RIGOROUS__.revalidatePage("/rigorous/hs-ppr");
            }
          });
          return "L1 PPR=141 · Page A PPR=140 · @sidebar hole OK";
        } finally {
          await page.close();
        }
      })
    );

    // Suite 7: Triple Synergy — HS + Cache-Slot + PPR (/rigorous/triple)
    checks.push(
      await check("rigorous-triple: 3D matrix surgical isolation (HS + Cache-Slot + PPR + 1s clock TTL)", async () => {
        const page = await browser.newPage();
        const hydrationErrors = [];
        page.on("console", (msg) => {
          if (msg.type() === "error" && /hydrat/i.test(msg.text())) {
            hydrationErrors.push(msg.text());
          }
        });
        try {
          await page.goto(`${base}/rigorous/triple?mode=turbo`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await waitForText(page, "#ts-l1-shell-seq", "100");
          await waitForText(page, "#ts-layout-shell-slot-seq", "100");
          await waitForText(page, "#ts-ppr-a-shell-seq", "100");
          await waitForText(page, "#ts-ppr-a-shell-slot-seq", "100");
          await waitForText(page, "#ts-ppr-a-hole-mode", "turbo");
          await waitForText(page, "#ts-ppr-a-hole-slot-seq", "100");
          await waitForText(page, "#ts-hole-nested-outer-seq", "100");
          await waitForText(page, "#ts-hole-nested-inner-seq", "100");

          // 1. Mutate all 3D layers and invalidate ONLY hole slot + nested inner hole slot
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              tsL1ShellSeq: 999,
              tsLayoutShellSlotSeq: 999,
              tsPprAShellSeq: 999,
              tsPprAShellSlotSeq: 999,
              tsPprAHoleHostSeq: 150,
              tsPprAHoleSlotSeq: 150,
              tsHoleNestedOuterSeq: 999,
              tsHoleNestedInnerSeq: 150,
              tsPprATtlShellSlotSeq: 151,
              tsPprATtlHoleSlotSeq: 151,
            });
            await window.__BENCH_RIGOROUS__.revalidateTag("ts-tag-ppr-a-hole-slot");
            await window.__BENCH_RIGOROUS__.revalidateTag("ts-tag-hole-nested-inner");
          });

          // Wait 1.25s so 1s Clock-TTL slots also expire naturally
          await new Promise((r) => setTimeout(r, 1250));

          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#ts-ppr-a-hole-host-seq", "150");
          await waitForText(page, "#ts-ppr-a-hole-slot-seq", "150");
          await waitForText(page, "#ts-hole-nested-inner-seq", "150");
          await waitForText(page, "#ts-ppr-a-ttl-shell-slot-seq", "151");
          await waitForText(page, "#ts-ppr-a-ttl-hole-slot-seq", "151");

          assert((await readText(page, "#ts-l1-shell-seq")) === "100", "L1 shell should stay 100");
          assert((await readText(page, "#ts-layout-shell-slot-seq")) === "100", "L1 shell slot should stay 100");
          assert((await readText(page, "#ts-ppr-a-shell-seq")) === "100", "Page A shell should stay 100");
          assert((await readText(page, "#ts-ppr-a-shell-slot-seq")) === "100", "Page A shell slot should stay 100");
          assert((await readText(page, "#ts-hole-nested-outer-seq")) === "100", "Nested outer hole slot should stay 100");
          assert(hydrationErrors.length === 0, `hydration errors: ${hydrationErrors.join("; ")}`);

          // 2. Verify sibling static-a and nested L2 PPR routes under Triple layout
          await page.click("#nav-ts-static-a");
          await waitForText(page, "#ts-static-a-host-seq", "100");
          await waitForText(page, "#ts-static-a-slot-seq", "100");

          await page.click("#nav-ts-nested");
          await waitForText(page, "#ts-l2-shell-seq", "100");
          await waitForText(page, "#ts-nested-layout-slot-seq", "100");
          await waitForText(page, "#ts-nested-ppr-shell-seq", "100");

          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
          return "3D isolation + 1s TTL slots + nested L2 + 0 hydration errors";
        } finally {
          await page.close();
        }
      })
    );

    // Check 23: Deep Stress #1 — Client pageCache deduplication vs <Link fresh> bypass
    checks.push(
      await check("rigorous-hs: client pageCache deduplication vs <Link fresh> bypass", async () => {
        const page = await browser.newPage();
        const backChannel = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/hs`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await backChannel.goto(`${base}/rigorous/hs`, { waitUntil: "networkidle" });
          await backChannel.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));

          await page.click("#hs-l1-client-btn");
          await waitForText(page, "#hs-l1-client-count", "1");
          const l1Mount = await readText(page, "#hs-l1-client-mount");

          // 1. Soft-navigate to Sibling A (populates client pageCache with seq=100)
          await page.click('[data-testid="nav-sibling-a"]');
          await waitForText(page, "#hs-sibling-a-seq", "100");

          // 2. Soft-navigate away to Sibling B
          await page.click('[data-testid="nav-sibling-b"]');
          await waitForText(page, "#hs-sibling-b-seq", "100");

          // 3. Out-of-band server mutation + revalidatePage("/rigorous/hs/sibling-a")
          await backChannel.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hsL1LayoutSeq: 999,
              hsSiblingASeq: 260,
            });
            await window.__BENCH_RIGOROUS__.revalidatePage("/rigorous/hs/sibling-a");
          });

          // 4. Normal <Link href="/rigorous/hs/sibling-a"> must reuse client pageCache (100) with 0 server fetches
          let siblingARequestsOnCachedLink = 0;
          const onReq = (req) => {
            if (req.url().includes("sibling-a")) siblingARequestsOnCachedLink += 1;
          };
          page.on("request", onReq);
          await page.click('[data-testid="nav-sibling-a"]');
          await page.waitForSelector("#hs-sibling-a-seq");
          page.off("request", onReq);

          const seqFromCache = await readText(page, "#hs-sibling-a-seq");
          assert(
            seqFromCache === "100" && siblingARequestsOnCachedLink === 0,
            `expected normal <Link> to serve 100 from client pageCache with 0 requests, got seq=${seqFromCache} reqs=${siblingARequestsOnCachedLink}`
          );

          // 5. <Link href="/rigorous/hs/sibling-a" fresh> must bypass client pageCache and fetch 260 while keeping L1 layout at 100
          await page.click('[data-testid="nav-sibling-b"]');
          await waitForText(page, "#hs-sibling-b-seq", "100");
          await page.click('[data-testid="nav-sibling-a-fresh"]');
          await waitForText(page, "#hs-sibling-a-seq", "260");
          assert((await readText(page, "#hs-l1-seq")) === "100", "L1 layout seq should stay 100 on <Link fresh>");
          assert((await readText(page, "#hs-l1-client-mount")) === l1Mount, "L1 mount should persist");
          assert((await readText(page, "#hs-l1-client-count")) === "1", "L1 client state should persist");

          await backChannel.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidatePage("/rigorous/hs/sibling-a");
            }
          });
          return "normal <Link>=100 (0 reqs) · <Link fresh>=260 · L1=100 preserved";
        } finally {
          await backChannel.close();
          await page.close();
        }
      })
    );

    // Check 24: Deep Stress #2 — router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v query guard
    checks.push(
      await check("rigorous-hs: router.refresh() page-only vs router.refresh({ layout: true }) & ?buildId/?v guard", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(
            `${base}/rigorous/hs/refresh-lab?filter=active&buildId=custom_b1&v=custom_v1`,
            { waitUntil: "networkidle" }
          );
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await waitForText(page, "#hs-refresh-layout-seq", "100");
          await waitForText(page, "#hs-refresh-page-seq", "100");
          assert((await readText(page, "#hs-refresh-query-filter")) === "active", "query filter=active");
          assert((await readText(page, "#hs-refresh-query-buildid")) === "custom_b1", "query buildId=custom_b1");
          assert((await readText(page, "#hs-refresh-query-v")) === "custom_v1", "query v=custom_v1");

          await page.click("#hs-refresh-lab-client-btn");
          await page.click("#hs-l1-client-btn");
          await waitForText(page, "#hs-refresh-lab-client-count", "1");
          await waitForText(page, "#hs-l1-client-count", "1");
          const layoutMount = await readText(page, "#hs-refresh-lab-client-mount");
          const l1Mount = await readText(page, "#hs-l1-client-mount");

          // Mutate both dynamic layout seq and dynamic page seq to 270
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hsRefreshLabLayoutSeq: 270,
              hsRefreshLabPageSeq: 270,
            });
          });

          // 1. Page-only router.refresh() must update page to 270 while keeping dynamic layout at 100
          await page.click("#btn-refresh-page");
          await waitForText(page, "#hs-refresh-page-seq", "270");
          const layoutSeqAfterPageRefresh = await readText(page, "#hs-refresh-layout-seq");
          assert(
            layoutSeqAfterPageRefresh === "100",
            `router.refresh() (page-only) must NOT re-execute layout (expected 100, got ${layoutSeqAfterPageRefresh})`
          );
          assert(
            (await readText(page, "#hs-refresh-query-buildid")) === "custom_b1" &&
              (await readText(page, "#hs-refresh-query-v")) === "custom_v1",
            "user ?buildId and ?v query params must not be clobbered on router.refresh()"
          );
          assert((await readText(page, "#hs-refresh-lab-client-mount")) === layoutMount, "refresh-lab layout mount preserved");
          assert((await readText(page, "#hs-l1-client-mount")) === l1Mount, "L1 layout mount preserved");

          // 2. router.refresh({ layout: true }) must now update layout to 270 while preserving client state
          await page.click("#btn-refresh-layout");
          await waitForText(page, "#hs-refresh-layout-seq", "270");
          assert((await readText(page, "#hs-refresh-lab-client-count")) === "1", "refresh-lab layout state preserved");
          assert((await readText(page, "#hs-l1-client-count")) === "1", "L1 layout state preserved");

          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
          return "page-only refresh (layout=100, page=270) · layout refresh (270) · ?buildId/?v intact";
        } finally {
          await page.close();
        }
      })
    );

    // Check 25: Deep Stress #3 — Page error.tsx containment inside outlet & soft-nav recovery
    checks.push(
      await check("rigorous-hs: page error.tsx containment inside outlet & soft-nav recovery", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/hs/error-isolation/healthy`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await page.waitForSelector("#hs-error-healthy-page");
          await page.click("#hs-l1-client-btn");
          await waitForText(page, "#hs-l1-client-count", "1");
          const l1Mount = await readText(page, "#hs-l1-client-mount");

          // Trigger broken page and soft-navigate to /rigorous/hs/error-isolation/broken
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({ hsTriggerBrokenPage: true });
          });
          await page.click('[data-testid="nav-error-broken"]');
          await page.waitForSelector("#hs-page-error-boundary");

          assert((await readText(page, "#hs-l1-client-mount")) === l1Mount, "L1 layout mount must survive child page error");
          assert((await readText(page, "#hs-l1-client-count")) === "1", "L1 layout state must survive child page error");

          // Soft-navigate back to healthy sibling and verify recovery without remounting L1 layout
          await page.click('[data-testid="nav-error-healthy"]');
          await page.waitForSelector("#hs-error-healthy-page");
          assert((await readText(page, "#hs-l1-client-mount")) === l1Mount, "L1 layout mount preserved after error recovery");
          assert((await readText(page, "#hs-l1-client-count")) === "1", "L1 layout state preserved after error recovery");

          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
          return "error.tsx contained in outlet · L1 state=1 preserved across break & recovery";
        } finally {
          await page.close();
        }
      })
    );

    // Check 26: Deep Stress #4 — Clock-based 1s Layout TTL vs 1s Page TTL surgical expiration (Table 1 Scenarios 1.1 & 1.4)
    checks.push(
      await check("rigorous-hs-ttl: clock-based 1s Layout TTL vs 1s Page TTL surgical expiration", async () => {
        const page = await browser.newPage();
        try {
          // Part A: 1s Layout TTL + 3600s Child Page (/rigorous/hs/ttl-layout)
          await page.goto(`${base}/rigorous/hs/ttl-layout`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await waitForText(page, "#hs-ttl-layout-seq", "100");
          await waitForText(page, "#hs-ttl-child-page-seq", "100");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hsTtlLayoutSeq: 280,
              hsTtlChildPageSeq: 999,
            });
          });

          await new Promise((r) => setTimeout(r, 1300));
          await page.reload({ waitUntil: "networkidle" });
          if ((await readText(page, "#hs-ttl-layout-seq")) !== "280") {
            await new Promise((r) => setTimeout(r, 250));
            await page.reload({ waitUntil: "networkidle" });
          }
          await waitForText(page, "#hs-ttl-layout-seq", "280");
          assert(
            (await readText(page, "#hs-ttl-child-page-seq")) === "100",
            "3600s child page must stay 100 when 1s layout TTL expires"
          );

          // Part B: 3600s L1 Layout + 1s Child Page TTL (/rigorous/hs/ttl-page)
          await page.goto(`${base}/rigorous/hs/ttl-page`, { waitUntil: "networkidle" });
          await waitForText(page, "#hs-l1-seq", "100");
          await waitForText(page, "#hs-ttl-page-only-seq", "100");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hsL1LayoutSeq: 999,
              hsTtlPageOnlySeq: 281,
            });
          });

          await new Promise((r) => setTimeout(r, 1300));
          await page.reload({ waitUntil: "networkidle" });
          if ((await readText(page, "#hs-ttl-page-only-seq")) !== "281") {
            await new Promise((r) => setTimeout(r, 250));
            await page.reload({ waitUntil: "networkidle" });
          }
          await waitForText(page, "#hs-ttl-page-only-seq", "281");
          assert(
            (await readText(page, "#hs-l1-seq")) === "100",
            "3600s L1 layout must stay 100 when 1s child page TTL expires"
          );

          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
          return "1s layout TTL=280 (child=100) · 1s page TTL=281 (L1=100)";
        } finally {
          await page.close();
        }
      })
    );

    // Check 27: Deep Stress #5 — Wildcard refreshSlot("*", { fresh: true }), layout banner slot & static-host 1s slot TTL
    checks.push(
      await check("rigorous-cache-slot-advanced: wildcard refreshSlot('*', { fresh: true }) & static-host 1s slot TTL", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/cache-slot`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-banner");
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-alpha");
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-beta");
            }
          });
          await page.reload({ waitUntil: "networkidle" });

          await waitForText(page, "#cs-layout-host-seq", "100");
          await waitForText(page, "#cs-dynamic-host-seq", "100");
          await waitForText(page, "#cs-banner-seq", "100");
          await waitForText(page, "#cs-alpha-seq", "100");
          await waitForText(page, "#cs-beta-seq", "100");

          await page.click("#cs-layout-client-btn");
          await page.click("#cs-page-client-btn");
          await waitForText(page, "#cs-layout-client-count", "1");
          await waitForText(page, "#cs-page-client-count", "1");

          // Mutate dynamic host counters (999) + slot counters (301, 302, 303) and trigger wildcard slot refresh
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              csLayoutHostSeq: 999,
              csDynamicHostSeq: 999,
              csBannerSeq: 301,
              csAlphaSeq: 302,
              csBetaSeq: 303,
            });
          });
          await page.click("#btn-refresh-all-slots");
          await waitForText(page, "#cs-banner-seq", "301");
          await waitForText(page, "#cs-alpha-seq", "302");
          await waitForText(page, "#cs-beta-seq", "303");

          const layoutHostAfterWildcard = await readText(page, "#cs-layout-host-seq");
          const pageHostAfterWildcard = await readText(page, "#cs-dynamic-host-seq");
          assert(
            layoutHostAfterWildcard === "100" && pageHostAfterWildcard === "100",
            `wildcard refreshSlot('*', { fresh: true }) must NOT re-execute host layout or host page (got layout=${layoutHostAfterWildcard}, page=${pageHostAfterWildcard})`
          );
          assert((await readText(page, "#cs-layout-client-count")) === "1", "layout client state preserved");
          assert((await readText(page, "#cs-page-client-count")) === "1", "page client state preserved");

          // Part B: /rigorous/cache-slot/static-host (1s slot TTL inside 3600s static host page)
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
          await page.goto(`${base}/rigorous/cache-slot/static-host`, { waitUntil: "networkidle" });
          await waitForText(page, "#cs-static-host-seq", "100");
          await waitForText(page, "#cs-static-slot-seq", "100");
          await waitForText(page, "#cs-static-fast-seq", "100");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              csStaticHostSeq: 999,
              csStaticSlotSeq: 999,
              csStaticFastSeq: 305,
            });
          });

          await new Promise((r) => setTimeout(r, 1300));
          await page.reload({ waitUntil: "networkidle" });
          if ((await readText(page, "#cs-static-fast-seq")) !== "305") {
            await new Promise((r) => setTimeout(r, 250));
            await page.reload({ waitUntil: "networkidle" });
          }
          await waitForText(page, "#cs-static-fast-seq", "305");
          assert((await readText(page, "#cs-static-host-seq")) === "100", "3600s static host page must stay 100");
          assert((await readText(page, "#cs-static-slot-seq")) === "100", "3600s sibling slot must stay 100");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-banner");
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-alpha");
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-beta");
            }
          });
          return "wildcard refreshSlot('*')=301/302/303 (hosts=100) · static-host 1s slot=305 (host=100)";
        } finally {
          await page.close();
        }
      })
    );

    // Check 28: Deep Stress #6 — Concurrency stampede protection (6 simultaneous cold-miss requests execute 150ms slot once)
    checks.push(
      await check("rigorous-cache-slot-stampede: 6 concurrent cold-miss requests coalesce into 1 slot execution", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/cache-slot`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          const execCount = await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              csStampedeExecCount: 0,
              csStampedeDelayMs: 150,
            });
            await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-stampede");
            await Promise.all(
              Array.from({ length: 6 }, () =>
                fetch("/rigorous/cache-slot", { cache: "no-store" }).then((r) => r.text())
              )
            );
            const s = await window.__BENCH_RIGOROUS__.getState();
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-stampede");
            }
            return s.csStampedeExecCount;
          });

          assert(
            execCount === 1,
            `expected stampede protection to execute cold 150ms slot exactly once across 6 concurrent requests, got ${execCount}`
          );
          return `6 concurrent cold requests -> ${execCount} slot execution`;
        } finally {
          await page.close();
        }
      })
    );

    // Check 29: Deep Stress #7 — Out-of-order Last-Write-Wins (LWW) concurrency race on slot refresh
    checks.push(
      await check("rigorous-hs-cache-slot-lww: out-of-order concurrency race (250ms slow vs 10ms fast slot refresh)", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/hs-cache-slot`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("hscs-tag-page-a-slot");
            }
          });
          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#hscs-page-a-slot-seq", "100");

          // Fire Request #1 (slow 250ms, seq=401, label="stale-slow") then 50ms later Request #2 (fast 10ms, seq=402, label="fresh-fast")
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hscsPageASlotSeq: 401,
              hscsPageASlotLabel: "stale-slow",
              hscsPageASlotDelayMs: 250,
            });
            // Do not await Request #1 before firing Request #2
            const p1 = Promise.resolve(window.__BENCH_RIGOROUS__.refreshSlot("hscs-page-a-slot", true));
            await new Promise((r) => setTimeout(r, 50));

            await window.__BENCH_RIGOROUS__.mutateState({
              hscsPageASlotSeq: 402,
              hscsPageASlotLabel: "fresh-fast",
              hscsPageASlotDelayMs: 10,
            });
            const p2 = Promise.resolve(window.__BENCH_RIGOROUS__.refreshSlot("hscs-page-a-slot", true));
            await Promise.allSettled([p1, p2]);
            await new Promise((r) => setTimeout(r, 400));
          });

          const domSeq = await readText(page, "#hscs-page-a-slot-seq");
          const domLabel = await readText(page, "#hscs-page-a-slot-label");
          assert(
            domSeq === "402" && domLabel === "fresh-fast",
            `LWW race failed in DOM: late slow request (401/stale-slow) overwrote fast request (402/fresh-fast); got seq=${domSeq} label=${domLabel}`
          );

          // Reload to verify server-side slot cache also retained 402/fresh-fast
          await page.reload({ waitUntil: "networkidle" });
          const reloadedSeq = await readText(page, "#hscs-page-a-slot-seq");
          const reloadedLabel = await readText(page, "#hscs-page-a-slot-label");
          assert(
            reloadedSeq === "402" && reloadedLabel === "fresh-fast",
            `LWW race failed in server cache: got seq=${reloadedSeq} label=${reloadedLabel}`
          );

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("hscs-tag-page-a-slot");
            }
          });
          return "LWW race won by Request #2 (402/fresh-fast) in both DOM and server cache";
        } finally {
          await page.close();
        }
      })
    );

    // Check 30: Deep Stress #8 — 1s PPR layout/page clock TTLs + surgical static-shell slot revalidateTag across PPR & static children
    checks.push(
      await check("rigorous-hs-ppr-ttl & triple-shell-slot: 1s PPR clock TTLs + surgical static-shell slot revalidateTag", async () => {
        const page = await browser.newPage();
        try {
          // Part A: 1s PPR Layout TTL + 3600s PPR Child Page (/rigorous/hs-ppr/ttl-ppr)
          await page.goto(`${base}/rigorous/hs-ppr/ttl-ppr`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await waitForText(page, "#hsppr-ttl-layout-shell-seq", "100");
          await waitForText(page, "#hsppr-ttl-child-shell-seq", "100");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hspprTtlLayoutShellSeq: 330,
              hspprTtlChildShellSeq: 999,
            });
          });
          await new Promise((r) => setTimeout(r, 1300));
          await page.reload({ waitUntil: "networkidle" });
          if ((await readText(page, "#hsppr-ttl-layout-shell-seq")) !== "330") {
            await new Promise((r) => setTimeout(r, 250));
            await page.reload({ waitUntil: "networkidle" });
          }
          await waitForText(page, "#hsppr-ttl-layout-shell-seq", "330");
          assert(
            (await readText(page, "#hsppr-ttl-child-shell-seq")) === "100",
            "3600s PPR child shell must stay 100 when 1s PPR layout TTL expires"
          );

          // Part B: 3600s PPR L1 Layout + 1s PPR Page TTL (/rigorous/hs-ppr/page-ttl-ppr)
          await page.goto(`${base}/rigorous/hs-ppr/page-ttl-ppr`, { waitUntil: "networkidle" });
          await waitForText(page, "#hsppr-l1-shell-seq", "100");
          await waitForText(page, "#hsppr-page-ttl-shell-seq", "100");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hspprL1ShellSeq: 999,
              hspprPageTtlShellSeq: 331,
            });
          });
          await new Promise((r) => setTimeout(r, 1300));
          await page.reload({ waitUntil: "networkidle" });
          if ((await readText(page, "#hsppr-page-ttl-shell-seq")) !== "331") {
            await new Promise((r) => setTimeout(r, 250));
            await page.reload({ waitUntil: "networkidle" });
          }
          await waitForText(page, "#hsppr-page-ttl-shell-seq", "331");
          assert(
            (await readText(page, "#hsppr-l1-shell-seq")) === "100",
            "3600s PPR L1 layout shell must stay 100 when 1s PPR page TTL expires"
          );

          // Part C: Surgical revalidateTag on static-shell slots in Triple Synergy without re-executing layout.tsx or page.tsx
          await page.goto(`${base}/rigorous/triple`, { waitUntil: "networkidle" });
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
          await waitForText(page, "#ts-l1-shell-seq", "100");
          await waitForText(page, "#ts-layout-shell-slot-seq", "100");
          await waitForText(page, "#ts-ppr-a-shell-seq", "100");
          await waitForText(page, "#ts-ppr-a-shell-slot-seq", "100");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              tsL1ShellSeq: 999,
              tsPprAShellSeq: 999,
              tsStaticBHostSeq: 999,
              tsLayoutShellSlotSeq: 340,
              tsPprAShellSlotSeq: 341,
              tsStaticBSlotSeq: 342,
            });
            await window.__BENCH_RIGOROUS__.revalidateTag("ts-tag-layout-shell-slot");
            await window.__BENCH_RIGOROUS__.revalidateTag("ts-tag-ppr-a-shell-slot");
            await window.__BENCH_RIGOROUS__.revalidateTag("ts-tag-static-b-slot");
          });

          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#ts-layout-shell-slot-seq", "340");
          await waitForText(page, "#ts-ppr-a-shell-slot-seq", "341");
          assert((await readText(page, "#ts-l1-shell-seq")) === "100", "L1 PPR shell must stay 100 on slot-only revalidateTag");
          assert((await readText(page, "#ts-ppr-a-shell-seq")) === "100", "Page A PPR shell must stay 100 on slot-only revalidateTag");

          await page.goto(`${base}/rigorous/triple/static-b`, { waitUntil: "networkidle" });
          await waitForText(page, "#ts-layout-shell-slot-seq", "340");
          await waitForText(page, "#ts-static-b-slot-seq", "342");
          assert((await readText(page, "#ts-l1-shell-seq")) === "100", "L1 shell on Static B must stay 100");
          assert((await readText(page, "#ts-static-b-host-seq")) === "100", "Static B host page must stay 100");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("ts-tag-layout-shell-slot");
              await window.__BENCH_RIGOROUS__.revalidateTag("ts-tag-ppr-a-shell-slot");
              await window.__BENCH_RIGOROUS__.revalidateTag("ts-tag-static-b-slot");
            }
          });
          return "PPR TTLs (330/331) · shell slots=340/341/342 (hosts=100)";
        } finally {
          await page.close();
        }
      })
    );

    // Check 31: Deep Stress #9 — Unmounted sibling slot refresh on Page B + immediate remount race to Page A
    checks.push(
      await check("rigorous-hs-cache-slot-unmounted: refreshSlot for Page A while unmounted on Page B + soft-nav back", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/hs-cache-slot`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("hscs-tag-page-a-slot");
            }
          });
          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#hscs-page-a-host-seq", "100");
          await waitForText(page, "#hscs-page-a-slot-seq", "100");

          // Soft-navigate Page A -> Page B -> Page A -> Page B so both Page A & Page B are warm in client pageCache
          await page.click("#nav-hscs-page-b");
          await waitForText(page, "#hscs-page-b-host-seq", "100");
          await page.click("#nav-hscs-page-a");
          await waitForText(page, "#hscs-page-a-host-seq", "100");
          await page.click("#nav-hscs-page-b");
          await waitForText(page, "#hscs-page-b-host-seq", "100");

          // While viewing Page B, mutate Page A's slot to 410 (and poison Page A host to 999) and refresh Page A's unmounted slot
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hscsPageAHostSeq: 999,
              hscsPageASlotSeq: 410,
            });
            await window.__BENCH_RIGOROUS__.refreshSlot("hscs-tag-page-a-slot", true);
          });

          // Soft-navigate back to Page A: must reuse client pageCache (0 page RSC fetches) while applying slotOverrideCache (410)
          let pageRscRequestsOnReturn = 0;
          const onReturnReq = (req) => {
            const u = req.url();
            if (u.includes("____rsc_page____") || u.includes("_rsc=")) {
              pageRscRequestsOnReturn += 1;
            }
          };
          page.on("request", onReturnReq);
          await page.click("#nav-hscs-page-a");
          await waitForText(page, "#hscs-page-a-slot-seq", "410");
          page.off("request", onReturnReq);

          const pageAHostAfterReturn = await readText(page, "#hscs-page-a-host-seq");
          assert(
            pageAHostAfterReturn === "100" && pageRscRequestsOnReturn === 0,
            `expected Page A to be served from client pageCache with 0 page RSC fetches (host=100) + slotOverride=410, got host=${pageAHostAfterReturn} pageRscReqs=${pageRscRequestsOnReturn}`
          );

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("hscs-tag-page-a-slot");
            }
          });
          return "unmounted slot refreshed on Page B -> 410 on Page A (host=100)";
        } finally {
          await page.close();
        }
      })
    );

    // Check 32: Deep Stress #10 — slotOverrideCache shadowing guard after refreshSlot followed by revalidateTag + router.refresh()
    checks.push(
      await check("rigorous-hs-cache-slot-shadow-guard: slotOverrideCache yields to newer server children on router.refresh()", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/hs-cache-slot`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("hscs-tag-page-a-slot");
            }
          });
          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#hscs-page-a-slot-seq", "100");

          await page.click("#hscs-page-a-slot-widget-btn");
          await waitForText(page, "#hscs-page-a-slot-widget-count", "1");
          const widgetMount = await readText(page, "#hscs-page-a-slot-widget-mount");

          // 1. Client refreshSlot sets slotOverrideCache to 420
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({ hscsPageASlotSeq: 420 });
            await window.__BENCH_RIGOROUS__.refreshSlot("hscs-page-a-slot", true);
          });
          await waitForText(page, "#hscs-page-a-slot-seq", "420");
          assert((await readText(page, "#hscs-page-a-slot-widget-count")) === "1", "widget state preserved after refreshSlot");

          // 2. Server revalidateTag + router.refresh() delivers 421; slotOverrideCache (420) must NOT shadow 421
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hscsPageAHostSeq: 100,
              hscsPageASlotSeq: 421,
            });
            await window.__BENCH_RIGOROUS__.revalidateTag("hscs-tag-page-a-slot");
            window.__BENCH_RIGOROUS__.refreshPage();
          });
          await waitForText(page, "#hscs-page-a-slot-seq", "421");
          assert((await readText(page, "#hscs-page-a-slot-widget-mount")) === widgetMount, "widget mount preserved");
          assert((await readText(page, "#hscs-page-a-slot-widget-count")) === "1", "widget state preserved after router.refresh()");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("hscs-tag-page-a-slot");
            }
          });
          return "slotOverride (420) yielded to router.refresh() (421) · widget state=1 intact";
        } finally {
          await page.close();
        }
      })
    );

    // Check 33: Deep Stress #11 — Tag-only <DinouCacheSlot tags={["cs-tag-only"]}> (no id prop) live refreshSlot & revalidateTag
    checks.push(
      await check("rigorous-cache-slot-tagonly: tag-only slot (no id prop) live refreshSlot & revalidateTag", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/cache-slot`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-only");
            }
          });
          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#cs-tagonly-seq", "100");
          await waitForText(page, "#cs-dynamic-host-seq", "100");

          // 1. Live client refreshSlot("cs-tag-only", { fresh: true }) without re-executing dynamic host page
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              csDynamicHostSeq: 999,
              csTagOnlySeq: 430,
            });
            await window.__BENCH_RIGOROUS__.refreshSlot("cs-tag-only", true);
          });
          await waitForText(page, "#cs-tagonly-seq", "430");
          const hostAfterTagOnlyRefresh = await readText(page, "#cs-dynamic-host-seq");
          assert(
            hostAfterTagOnlyRefresh === "100",
            `tag-only refreshSlot must NOT re-execute dynamic host page (expected 100, got ${hostAfterTagOnlyRefresh})`
          );

          // 2. Server revalidateTag("cs-tag-only") + reload
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              csDynamicHostSeq: 100,
              csTagOnlySeq: 431,
            });
            await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-only");
          });
          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#cs-tagonly-seq", "431");

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateTag("cs-tag-only");
            }
          });
          return "tag-only slot refreshSlot=430 (host=100) · revalidateTag=431";
        } finally {
          await page.close();
        }
      })
    );

    // Check 34: Deep Stress #12 — Multi-level ancestor L1 revalidateLayout cascade (L1 -> L2 -> Nested PPR & Static children)
    checks.push(
      await check("rigorous-triple-cascade: ancestor L1 revalidateLayout cascades through L2 to nested PPR & static children", async () => {
        const page = await browser.newPage();
        try {
          await page.goto(`${base}/rigorous/triple/nested`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await waitForText(page, "#ts-l1-shell-seq", "100");
          await waitForText(page, "#ts-l2-shell-seq", "100");
          await waitForText(page, "#ts-nested-layout-slot-seq", "100");
          await waitForText(page, "#ts-nested-ppr-shell-seq", "100");

          // Bump ancestor L1 to 440 while poisoning L1 slot, L2 slot, nested PPR page, and nested Static page to 999
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              tsL1ShellSeq: 440,
              tsLayoutShellSlotSeq: 999,
              tsNestedLayoutSlotSeq: 999,
              tsNestedPprShellSeq: 999,
              tsNestedStaticHostSeq: 999,
            });
            await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/triple");
          });

          // 1. Reload nested PPR child (/rigorous/triple/nested)
          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#ts-l1-shell-seq", "440");
          assert((await readText(page, "#ts-layout-shell-slot-seq")) === "100", "L1 slot must stay 100");
          assert((await readText(page, "#ts-nested-layout-slot-seq")) === "100", "L2 slot must stay 100");
          assert((await readText(page, "#ts-nested-ppr-shell-seq")) === "100", "nested PPR child shell must stay 100");

          // 2. Visit nested Static child (/rigorous/triple/nested/static-child)
          await page.goto(`${base}/rigorous/triple/nested/static-child`, { waitUntil: "networkidle" });
          await waitForText(page, "#ts-l1-shell-seq", "440");
          assert((await readText(page, "#ts-nested-layout-slot-seq")) === "100", "L2 slot on static-child must stay 100");
          assert(
            (await readText(page, "#ts-nested-static-host-seq")) === "100",
            "nested static-child host page must stay 100"
          );

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/triple");
              await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/triple/nested");
            }
          });
          return "L1=440 cascaded through L2 to nested PPR (100) & nested static-child (100)";
        } finally {
          await page.close();
        }
      })
    );

    // Check 35: Deep Stress #13 — Simultaneous Promise.all([revalidateLayout, revalidatePage]) serialization + 0 hydration errors
    checks.push(
      await check("rigorous-hs-concurrent-reval: simultaneous revalidateLayout + revalidatePage serialization & F5 hydration", async () => {
        const page = await browser.newPage();
        const hydrationErrors = [];
        page.on("console", (msg) => {
          if (msg.type() === "error" && /hydrat/i.test(msg.text())) {
            hydrationErrors.push(msg.text());
          }
        });
        try {
          await page.goto(`${base}/rigorous/hs/sibling-b`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hsL1LayoutSeq: 450,
              hsSiblingBSeq: 451,
            });
            await Promise.all([
              window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/hs"),
              window.__BENCH_RIGOROUS__.revalidatePage("/rigorous/hs/sibling-b"),
            ]);
          });

          await page.reload({ waitUntil: "networkidle" });
          await waitForText(page, "#hs-l1-seq", "450");
          await waitForText(page, "#hs-sibling-b-seq", "451");
          assert(hydrationErrors.length === 0, `hydration errors: ${hydrationErrors.join("; ")}`);

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/hs");
              await window.__BENCH_RIGOROUS__.revalidatePage("/rigorous/hs/sibling-b");
            }
          });
          return "concurrent revalidateLayout(450) + revalidatePage(451) aligned · 0 hydration errors";
        } finally {
          await page.close();
        }
      })
    );

    // Check 36: Deep Stress #14 — Lazy index.html regeneration & 0 hydration errors on hard reload / direct URL access for co-located page & descendant pages after revalidateLayout
    checks.push(
      await check("rigorous-hs-lazy-html-hydration: revalidateLayout lazy index.html recomposition & 0 hydration errors on co-located & child pages (hard nav)", async () => {
        const page = await browser.newPage();
        const hydrationErrors = [];
        page.on("console", (msg) => {
          const text = msg.text();
          if (
            (msg.type() === "error" || msg.type() === "warning") &&
            (/hydrat|did not match|server rendered html|react\.dev\/errors\/(418|425)/i.test(text))
          ) {
            hydrationErrors.push(text);
          }
        });
        page.on("pageerror", (err) => {
          if (/hydrat|418|425/i.test(err.message)) {
            hydrationErrors.push(err.message);
          }
        });
        try {
          await page.goto(`${base}/rigorous/hs`, { waitUntil: "networkidle" });
          await page.waitForFunction(() => Boolean(window.__BENCH_RIGOROUS__));
          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());

          await waitForText(page, "#hs-l1-seq", "100");
          await waitForText(page, "#hs-index-seq", "100");

          // Part 1: Revalidate L1 layout (/rigorous/hs) to 460 while poisoning co-located index page (999), direct child sibling-a (999), L2 co-located page-1 (999), and deep child page-2 (999)
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hsL1LayoutSeq: 460,
              hsL1PropsSeq: 460,
              hsIndexPageSeq: 999,
              hsIndexPropsSeq: 999,
              hsSiblingASeq: 999,
              hsNestedPage1Seq: 999,
              hsNestedPage2Seq: 999,
            });
            await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/hs");
          });

          // 1A. Hard reload on co-located page (/rigorous/hs next to /rigorous/hs/layout.tsx)
          const resColocatedL1 = await page.reload({ waitUntil: "networkidle" });
          const htmlColocatedL1 = await resColocatedL1.text();
          assert(
            htmlColocatedL1.includes("460") && !htmlColocatedL1.includes(">999<"),
            "co-located /rigorous/hs SSR HTML must contain updated L1=460 and cached page=100"
          );
          await waitForText(page, "#hs-l1-seq", "460");
          assert((await readText(page, "#hs-index-seq")) === "100", "co-located index page must stay 100");
          assert((await readText(page, "#hs-index-props-seq")) === "100", "co-located index props must stay 100");

          // 1B. Direct hard URL navigation (page.goto) to direct child page (/rigorous/hs/sibling-a)
          const resSiblingA = await page.goto(`${base}/rigorous/hs/sibling-a`, { waitUntil: "networkidle" });
          const htmlSiblingA = await resSiblingA.text();
          assert(
            htmlSiblingA.includes("460") && !htmlSiblingA.includes(">999<"),
            "direct child /rigorous/hs/sibling-a SSR HTML must lazily recompose L1=460 with cached sibling-a=100"
          );
          await waitForText(page, "#hs-l1-seq", "460");
          assert((await readText(page, "#hs-sibling-a-seq")) === "100", "direct child sibling-a must stay 100");

          // 1C. Direct hard URL navigation (page.goto) to child route with L2 layout + co-located page (/rigorous/hs/nested)
          const resNestedP1 = await page.goto(`${base}/rigorous/hs/nested`, { waitUntil: "networkidle" });
          const htmlNestedP1 = await resNestedP1.text();
          assert(
            htmlNestedP1.includes("460") && !htmlNestedP1.includes(">999<"),
            "child /rigorous/hs/nested SSR HTML must lazily recompose L1=460 with cached L2=100 & page1=100"
          );
          await waitForText(page, "#hs-l1-seq", "460");
          assert((await readText(page, "#hs-l2-seq")) === "100", "L2 layout must stay 100");
          assert((await readText(page, "#hs-nested-page1-seq")) === "100", "nested co-located page-1 must stay 100");

          // 1D. Direct hard URL navigation (page.goto) to deep child page (/rigorous/hs/nested/page-2)
          const resNestedP2 = await page.goto(`${base}/rigorous/hs/nested/page-2`, { waitUntil: "networkidle" });
          const htmlNestedP2 = await resNestedP2.text();
          assert(
            htmlNestedP2.includes("460") && !htmlNestedP2.includes(">999<"),
            "deep child /rigorous/hs/nested/page-2 SSR HTML must lazily recompose L1=460 with cached L2=100 & page2=100"
          );
          await waitForText(page, "#hs-l1-seq", "460");
          assert((await readText(page, "#hs-l2-seq")) === "100", "L2 layout on page-2 must stay 100");
          assert((await readText(page, "#hs-nested-page2-seq")) === "100", "deep child page-2 must stay 100");

          // Part 2: Revalidate nested L2 layout (/rigorous/hs/nested) to 461 while poisoning co-located & child pages (999)
          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.mutateState({
              hsL2Seq: 461,
              hsIndexPageSeq: 999,
              hsNestedPage1Seq: 999,
              hsNestedPage2Seq: 999,
            });
            await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/hs/nested");
          });

          // 2A. Hard reload on deep child page (/rigorous/hs/nested/page-2)
          const resNestedP2AfterL2 = await page.reload({ waitUntil: "networkidle" });
          const htmlNestedP2AfterL2 = await resNestedP2AfterL2.text();
          assert(
            htmlNestedP2AfterL2.includes("461") && !htmlNestedP2AfterL2.includes(">999<"),
            "deep child /rigorous/hs/nested/page-2 SSR HTML must lazily recompose L2=461 with cached L1=460 & page2=100"
          );
          await waitForText(page, "#hs-l1-seq", "460");
          await waitForText(page, "#hs-l2-seq", "461");
          assert((await readText(page, "#hs-nested-page2-seq")) === "100", "deep child page-2 must stay 100 after L2 reval");

          // 2B. Direct hard URL navigation (page.goto) to co-located L2 page (/rigorous/hs/nested)
          const resNestedP1AfterL2 = await page.goto(`${base}/rigorous/hs/nested`, { waitUntil: "networkidle" });
          const htmlNestedP1AfterL2 = await resNestedP1AfterL2.text();
          assert(
            htmlNestedP1AfterL2.includes("461") && !htmlNestedP1AfterL2.includes(">999<"),
            "co-located /rigorous/hs/nested SSR HTML must lazily recompose L2=461 with cached L1=460 & page1=100"
          );
          await waitForText(page, "#hs-l1-seq", "460");
          await waitForText(page, "#hs-l2-seq", "461");
          assert((await readText(page, "#hs-nested-page1-seq")) === "100", "co-located L2 page-1 must stay 100 after L2 reval");

          assert(
            hydrationErrors.length === 0,
            `expected 0 hydration errors across co-located & child hard navigations, got: ${hydrationErrors.join("; ")}`
          );

          await page.evaluate(async () => {
            await window.__BENCH_RIGOROUS__.resetState();
            if (window.__BENCH_RIGOROUS__.framework === "dinou") {
              await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/hs");
              await window.__BENCH_RIGOROUS__.revalidateLayout("/rigorous/hs/nested");
            }
          });
          return "co-located (/rigorous/hs, /nested) & child (/nested/page-2) lazy HTML recomposed (L1=460, L2=461, pages=100) · 0 hydration errors";
        } finally {
          await page.close();
        }
      })
    );
  } finally {
    await browser.close();
  }

  await server.stop();

  const passed = checks.filter((c) => c.ok).length;
  console.log(`\n${passed}/${checks.length} checks OK`);
  for (const c of checks) {
    console.log(`  ${c.ok ? "✓" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
  }

  results.push({
    framework: fw.id,
    version: fw.version,
    at: new Date().toISOString(),
    passed,
    total: checks.length,
    checks,
    ppr: { shellMs: round(pprFirst, 2), totalMs: round(pprTotal, 2) },
  });
}

// Preserve results of frameworks not executed in this run.
const validFrameworkIds = new Set(allFrameworks.map((f) => f.id));
const previousVerify = (await readJson(path.join(ROOT, "results", "verify.json"), [])) ?? [];
const mergedVerify = [
  ...previousVerify.filter(
    (p) => validFrameworkIds.has(p.framework) && !results.some((r) => r.framework === p.framework)
  ),
  ...results,
];
await writeJson(
  path.join(ROOT, "results", "verify.json"),
  mergedVerify.sort((a, b) => a.framework.localeCompare(b.framework))
);

const allPassed = results.every((r) => r.passed === r.total);
console.log(`\n${allPassed ? "VERIFY OK" : "VERIFY FAILED"} — results in results/verify.json`);
if (!allPassed) process.exitCode = 1;
