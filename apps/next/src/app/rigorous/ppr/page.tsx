import React, { Suspense } from "react";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "@/shared/components/rigorous-ui";
import { RigorousControls } from "../rigorous-controls";
import { sleep } from "@/shared/lib/data";

async function StaticCollapsedBoundary() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ppr-rig-shell-tag", "page:/rigorous/ppr", "subtree:/rigorous/ppr");
  await sleep(5);
  const s = getRigorousState();
  return (
    <div id="ppr-rig-static-suspense">
      Static Collapsed Suspense Seq:{" "}
      <span id="ppr-rig-static-suspense-seq">{s.pprStaticSuspenseSeq}</span>
    </div>
  );
}

async function CookieDynamicHole() {
  const cookieStore = await cookies();
  const rawUser = cookieStore.get("rig_user")?.value;
  const user = rawUser && rawUser.length > 0 ? rawUser : "guest";
  await sleep(30);
  const s = getRigorousState();
  return (
    <div id="ppr-hole-cookie">
      Cookie User: <span id="ppr-hole-cookie-user">{user}</span> | Seq:{" "}
      <span id="ppr-hole-cookie-seq">{s.pprHoleCookieSeq}</span>
    </div>
  );
}

async function QueryDynamicHole({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  await connection();
  const sp = await searchParams;
  const theme = typeof sp?.theme === "string" && sp.theme ? sp.theme : "light";
  await sleep(15);
  const s = getRigorousState();
  return (
    <div id="ppr-hole-query">
      Query Theme: <span id="ppr-hole-query-theme">{theme}</span> | Seq:{" "}
      <span id="ppr-hole-query-seq">{s.pprHoleQuerySeq}</span>
    </div>
  );
}

async function ClientWidgetDynamicHole() {
  const hdrs = await headers();
  void hdrs.get("user-agent");
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ppr-hole-client-wrapper">
      <RigorousSlotWidget
        id="ppr-hole-client-widget"
        serverToken={`ppr-client-${s.pprHoleClientSeq}`}
      />
    </div>
  );
}

async function InnerDynamicBoundary() {
  await connection();
  await sleep(25);
  const s = getRigorousState();
  return (
    <div id="ppr-inner-dynamic">
      Inner Dynamic Seq: <span id="ppr-inner-dynamic-val">{s.pprInnerDynamicSeq}</span>
    </div>
  );
}

async function getOuterStaticState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ppr-rig-shell-tag", "page:/rigorous/ppr", "subtree:/rigorous/ppr");
  await sleep(5);
  return getRigorousState();
}

async function OuterStaticBoundary() {
  const s = await getOuterStaticState();
  return (
    <div id="ppr-outer-static" style={{ border: "1px dashed #0288d1", padding: 6 }}>
      <div>
        Outer Static Collapsed Seq: <span id="ppr-outer-static-val">{s.pprOuterStaticSeq}</span>
      </div>
      <Suspense fallback={<div id="ppr-fallback-inner-dyn">Loading inner dynamic...</div>}>
        <InnerDynamicBoundary />
      </Suspense>
    </div>
  );
}

async function DeepInnerDynamicBoundary() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ppr-deep-inner">
      Deep Inner Dynamic Seq: <span id="ppr-deep-inner-val">{s.pprDeepInnerSeq}</span>
    </div>
  );
}

async function OuterDynamicBoundary() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ppr-outer-dynamic" style={{ border: "1px dashed #7b1fa2", padding: 6 }}>
      <div>
        Outer Dynamic Seq: <span id="ppr-outer-dynamic-val">{s.pprOuterDynamicSeq}</span>
      </div>
      <Suspense fallback={<div id="ppr-fallback-deep-inner">Loading deep inner...</div>}>
        <DeepInnerDynamicBoundary />
      </Suspense>
    </div>
  );
}

const MemoDynamicHole = React.memo(async function MemoDynamicHoleInner() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ppr-hole-memo">
      Memo Hole Seq: <span id="ppr-hole-memo-val">{s.pprMemoHoleSeq}</span>
    </div>
  );
});

async function XssGuardDynamicHole() {
  await connection();
  await sleep(15);
  return (
    <div id="ppr-hole-xss-guard">
      {"Safe XSS Guard: </template><script>window.__XSS_PPR=true</script>"}
    </div>
  );
}

async function getPprShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ppr-rig-shell-tag", "page:/rigorous/ppr", "subtree:/rigorous/ppr");
  return getRigorousState();
}

export default async function PprRigorousPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const s = await getPprShellState();
  return (
    <div id="ppr-rig-shell" style={{ border: "2px solid #ad1457", padding: 12 }}>
      <RigorousControls suite="ppr" />
      <h2>Rigorous PPR Suite</h2>
      <p>
        Static Shell Seq: <span id="ppr-rig-shell-seq">{s.pprShellSeq}</span> | Label:{" "}
        <span id="ppr-rig-shell-label">{s.pprShellLabel}</span>
      </p>
      <RigorousClientProbe id="ppr-shell-client" label="PPR Shell Client" />

      <nav style={{ display: "flex", gap: 10, margin: "8px 0" }}>
        <Link id="nav-ppr-main" href="/rigorous/ppr">
          Main PPR
        </Link>
        <Link id="nav-ppr-inherited" href="/rigorous/ppr/inherited">
          Inherited PPR
        </Link>
        <Link id="nav-ppr-optout" href="/rigorous/ppr/inherited/opt-out">
          Opt-Out Child
        </Link>
        <Link id="nav-ppr-ttl" href="/rigorous/ppr/ttl-shell">
          TTL Shell (1s)
        </Link>
      </nav>

      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <Suspense fallback={<div id="ppr-fallback-static">Static suspense fallback</div>}>
          <StaticCollapsedBoundary />
        </Suspense>

        <Suspense fallback={<div id="ppr-fallback-cookie">Loading cookie hole...</div>}>
          <CookieDynamicHole />
        </Suspense>

        <Suspense fallback={<div id="ppr-fallback-query">Loading query hole...</div>}>
          <QueryDynamicHole searchParams={searchParams} />
        </Suspense>

        <Suspense fallback={<div id="ppr-fallback-client">Loading client widget hole...</div>}>
          <ClientWidgetDynamicHole />
        </Suspense>

        <Suspense fallback={<div id="ppr-fallback-outer-static">Loading outer static...</div>}>
          <OuterStaticBoundary />
        </Suspense>

        <Suspense fallback={<div id="ppr-fallback-outer-dyn">Loading outer dynamic...</div>}>
          <OuterDynamicBoundary />
        </Suspense>

        <Suspense fallback={<div id="ppr-fallback-memo">Loading memo hole...</div>}>
          <MemoDynamicHole />
        </Suspense>

        <Suspense fallback={<div id="ppr-fallback-xss">Loading xss guard hole...</div>}>
          <XssGuardDynamicHole />
        </Suspense>
      </div>
    </div>
  );
}

