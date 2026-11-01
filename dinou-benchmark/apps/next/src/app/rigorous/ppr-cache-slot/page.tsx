import { Suspense, type ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "@/shared/components/rigorous-ui";
import { RigorousControls } from "../rigorous-controls";
import { rigorousSlotServerPing } from "../rigorous-actions";
import { sleep } from "@/shared/lib/data";

async function SynShellSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("syn-tag-shell-slot", "slot:syn-shell-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="syn-shell-slot-box">
      Shell Slot Seq: <span id="syn-shell-slot-seq">{s.synShellSlotSeq}</span> | Label:{" "}
      <span id="syn-shell-slot-label">{s.synShellSlotLabel}</span>
    </div>
  );
}

async function SynShellTtlSlotContent() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("syn-tag-shell-ttl", "slot:syn-shell-ttl-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="syn-shell-ttl-slot-box">
      Shell TTL (1s) Slot Seq: <span id="syn-shell-ttl-slot-seq">{s.synShellTtlSlotSeq}</span>
    </div>
  );
}

async function SynStaticSuspSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("syn-tag-static-susp-slot", "slot:syn-static-susp-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="syn-static-susp-slot-box">
      Static Susp Slot Seq: <span id="syn-static-susp-slot-seq">{s.synStaticSuspSlotSeq}</span> | Label:{" "}
      <span id="syn-static-susp-slot-label">{s.synStaticSuspSlotLabel}</span>
    </div>
  );
}

async function getSynStaticSuspHostState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("syn-shell-tag", "page:/rigorous/ppr-cache-slot", "subtree:/rigorous/ppr-cache-slot");
  await sleep(5);
  return getRigorousState();
}

async function SynStaticSuspenseBoundary() {
  const s = await getSynStaticSuspHostState();
  return (
    <div id="syn-static-suspense" style={{ border: "1px dashed #00897b", padding: 8 }}>
      <div>
        Static Suspense Host Seq: <span id="syn-static-susp-seq">{s.synStaticSuspSeq}</span>
      </div>
      <SynStaticSuspSlotContent />
    </div>
  );
}

async function SynHoleSlotAContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("syn-tag-hole-slot-a", "slot:syn-hole-slot-a", "slot:*");
  const s = getRigorousState();
  return (
    <div id="syn-hole-slot-a-box">
      Hole1 Slot A Seq: <span id="syn-hole-slot-a-seq">{s.synHoleSlotASeq}</span> | Label:{" "}
      <span id="syn-hole-slot-a-label">{s.synHoleSlotALabel}</span>
    </div>
  );
}

function SynHoleSlotNoCacheContent() {
  const s = getRigorousState();
  return (
    <div id="syn-hole-slot-nocache-box">
      Hole1 NoCache Slot Seq: <span id="syn-hole-slot-nocache-seq">{s.synHoleSlotNoCacheSeq}</span>
    </div>
  );
}

async function SynHoleTtlSlotContent() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("syn-tag-hole-ttl", "slot:syn-hole-ttl-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="syn-hole-ttl-slot-box">
      Hole1 TTL (1s) Slot Seq: <span id="syn-hole-ttl-slot-seq">{s.synHoleTtlSlotSeq}</span>
    </div>
  );
}

async function SynDynamicHole1() {
  const cookieStore = await cookies();
  const rawUser = cookieStore.get("syn_user")?.value;
  const user = rawUser && rawUser.length > 0 ? rawUser : "anon";
  await sleep(25);
  const s = getRigorousState();
  return (
    <div id="syn-hole-1" style={{ border: "1px solid #1e88e5", padding: 8 }}>
      <div>
        Hole 1 Host Seq: <span id="syn-hole1-host-seq">{s.synHole1HostSeq}</span> | User:{" "}
        <span id="syn-hole1-user">{user}</span>
      </div>
      <SynHoleSlotAContent />
      <SynHoleSlotNoCacheContent />
      <SynHoleTtlSlotContent />
    </div>
  );
}

async function SynNestedInnerSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("syn-tag-nested-inner", "slot:syn-nested-inner", "slot:*");
  const s = getRigorousState();
  return (
    <div id="syn-nested-inner-box" style={{ border: "1px dotted #8e24aa", padding: 6, marginTop: 4 }}>
      Nested Inner Seq: <span id="syn-nested-inner-seq">{s.synNestedInnerSeq}</span> | Label:{" "}
      <span id="syn-nested-inner-label">{s.synNestedInnerLabel}</span>
    </div>
  );
}

async function SynNestedOuterSlotContent({ children }: { children: ReactNode }) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("syn-tag-nested-outer", "slot:syn-nested-outer", "slot:*");
  const s = getRigorousState();
  return (
    <div id="syn-nested-outer-box" style={{ border: "1px dashed #5e35b1", padding: 6 }}>
      <div>
        Nested Outer Seq: <span id="syn-nested-outer-seq">{s.synNestedOuterSeq}</span> | Label:{" "}
        <span id="syn-nested-outer-label">{s.synNestedOuterLabel}</span>
      </div>
      {children}
    </div>
  );
}

async function SynDynamicHole2() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="syn-hole-2" style={{ border: "1px solid #5e35b1", padding: 8 }}>
      <div>
        Hole 2 Host Seq: <span id="syn-hole2-host-seq">{s.synHole2HostSeq}</span>
      </div>
      <SynNestedOuterSlotContent>
        <SynNestedInnerSlotContent />
      </SynNestedOuterSlotContent>
    </div>
  );
}

async function SynClientSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("syn-tag-client-slot", "slot:syn-client-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="syn-client-slot-box">
      <div>
        Client Slot Seq: <span id="syn-client-slot-seq">{s.synClientSlotSeq}</span> | Label:{" "}
        <span id="syn-client-slot-label">{s.synClientSlotLabel}</span>
      </div>
      <RigorousSlotWidget
        id="syn-hole-client-widget"
        serverToken={`syn-client-${s.synClientSlotSeq}`}
        onServerPing={rigorousSlotServerPing}
      />
    </div>
  );
}

async function SiblingCookieReader() {
  const cookieStore = await cookies();
  const rawSession = cookieStore.get("syn_session")?.value;
  const session = rawSession && rawSession.length > 0 ? rawSession : "s-default";
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="syn-hole-3-host">
      Hole 3 Host Seq: <span id="syn-hole3-host-seq">{s.synHole3HostSeq}</span> | Session:{" "}
      <span id="syn-hole3-session">{session}</span>
    </div>
  );
}

async function getSynShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("syn-shell-tag", "page:/rigorous/ppr-cache-slot", "subtree:/rigorous/ppr-cache-slot");
  return getRigorousState();
}

export default async function PprCacheSlotSynergyPage() {
  const s = await getSynShellState();
  return (
    <div id="syn-ppr-cs-page" style={{ border: "2px solid #1565c0", padding: 12 }}>
      <RigorousControls suite="ppr-cache-slot" />
      <h2>Pairwise Synergy #1: PPR + Cache-Slot</h2>
      <p>
        Static Shell Seq: <span id="syn-shell-seq">{s.synShellSeq}</span> | Label:{" "}
        <span id="syn-shell-label">{s.synShellLabel}</span>
      </p>
      <RigorousClientProbe id="syn-shell-client" label="Syn Shell Client" />

      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        <SynShellSlotContent />
        <Suspense fallback={null}>
          <SynShellTtlSlotContent />
        </Suspense>

        <Suspense fallback={<div id="syn-fallback-static">Static suspense fallback</div>}>
          <SynStaticSuspenseBoundary />
        </Suspense>

        <Suspense fallback={<div id="syn-fallback-hole-1">Loading syn hole 1...</div>}>
          <SynDynamicHole1 />
        </Suspense>

        <Suspense fallback={<div id="syn-fallback-hole-2">Loading syn hole 2...</div>}>
          <SynDynamicHole2 />
        </Suspense>

        <Suspense fallback={<div id="syn-fallback-hole-3">Loading syn hole 3...</div>}>
          <div id="syn-hole-3" style={{ border: "1px solid #00838f", padding: 8 }}>
            <SynClientSlotContent />
            <SiblingCookieReader />
          </div>
        </Suspense>
      </div>
    </div>
  );
}

