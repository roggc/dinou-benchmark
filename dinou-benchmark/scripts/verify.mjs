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
  await page.waitForFunction(
    ({ sel, exp }) => {
      const el = document.querySelector(sel);
      return el && (el.textContent ?? "").trim() === exp;
    },
    { sel: selector, exp: target },
    { timeout }
  );
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

          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
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

          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
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

          await page.evaluate(() => window.__BENCH_RIGOROUS__.resetState());
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
