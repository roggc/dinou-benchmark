import { Suspense } from "react";
import { getContext } from "dinou";
import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "../../shared/components/rigorous-ui";
import { RigorousControls } from "../rigorous-controls";
import { rigorousSlotServerPing } from "../rigorous-actions";
import { sleep } from "../../shared/lib/data";

function SynShellSlotContent() {
  const s = getRigorousState();
  return (
    <div id="syn-shell-slot-box">
      Shell Slot Seq: <span id="syn-shell-slot-seq">{s.synShellSlotSeq}</span> | Label:{" "}
      <span id="syn-shell-slot-label">{s.synShellSlotLabel}</span>
    </div>
  );
}

function SynShellTtlSlotContent() {
  const s = getRigorousState();
  return (
    <div id="syn-shell-ttl-slot-box">
      Shell TTL (1s) Slot Seq: <span id="syn-shell-ttl-slot-seq">{s.synShellTtlSlotSeq}</span>
    </div>
  );
}

function SynStaticSuspSlotContent() {
  const s = getRigorousState();
  return (
    <div id="syn-static-susp-slot-box">
      Static Susp Slot Seq: <span id="syn-static-susp-slot-seq">{s.synStaticSuspSlotSeq}</span> | Label:{" "}
      <span id="syn-static-susp-slot-label">{s.synStaticSuspSlotLabel}</span>
    </div>
  );
}

async function SynStaticSuspenseBoundary() {
  await sleep(5);
  const s = getRigorousState();
  return (
    <div id="syn-static-suspense" style={{ border: "1px dashed #00897b", padding: 8 }}>
      <div>
        Static Suspense Host Seq: <span id="syn-static-susp-seq">{s.synStaticSuspSeq}</span>
      </div>
      <DinouCacheSlot id="syn-static-susp-slot" tags={["syn-tag-static-susp-slot"]} revalidate={3600}>
        <SynStaticSuspSlotContent />
      </DinouCacheSlot>
    </div>
  );
}

function SynHoleSlotAContent() {
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

function SynHoleTtlSlotContent() {
  const s = getRigorousState();
  return (
    <div id="syn-hole-ttl-slot-box">
      Hole1 TTL (1s) Slot Seq: <span id="syn-hole-ttl-slot-seq">{s.synHoleTtlSlotSeq}</span>
    </div>
  );
}

async function SynDynamicHole1() {
  const ctx = getContext();
  const rawUser = ctx?.req?.cookies?.syn_user;
  const user = typeof rawUser === "string" && rawUser ? rawUser : "anon";
  await sleep(25);
  const s = getRigorousState();
  return (
    <div id="syn-hole-1" style={{ border: "1px solid #1e88e5", padding: 8 }}>
      <div>
        Hole 1 Host Seq: <span id="syn-hole1-host-seq">{s.synHole1HostSeq}</span> | User:{" "}
        <span id="syn-hole1-user">{user}</span>
      </div>
      <DinouCacheSlot id="syn-hole-slot-a" tags={["syn-tag-hole-slot-a"]} revalidate={3600}>
        <SynHoleSlotAContent />
      </DinouCacheSlot>
      <DinouCacheSlot id="syn-hole-slot-nocache" revalidate={0}>
        <SynHoleSlotNoCacheContent />
      </DinouCacheSlot>
      <DinouCacheSlot id="syn-hole-ttl-slot" tags={["syn-tag-hole-ttl"]} revalidate={1}>
        <SynHoleTtlSlotContent />
      </DinouCacheSlot>
    </div>
  );
}

function SynNestedInnerSlotContent() {
  const s = getRigorousState();
  return (
    <div id="syn-nested-inner-box" style={{ border: "1px dotted #8e24aa", padding: 6, marginTop: 4 }}>
      Nested Inner Seq: <span id="syn-nested-inner-seq">{s.synNestedInnerSeq}</span> | Label:{" "}
      <span id="syn-nested-inner-label">{s.synNestedInnerLabel}</span>
    </div>
  );
}

function SynNestedOuterSlotContent() {
  const s = getRigorousState();
  return (
    <div id="syn-nested-outer-box" style={{ border: "1px dashed #5e35b1", padding: 6 }}>
      <div>
        Nested Outer Seq: <span id="syn-nested-outer-seq">{s.synNestedOuterSeq}</span> | Label:{" "}
        <span id="syn-nested-outer-label">{s.synNestedOuterLabel}</span>
      </div>
      <DinouCacheSlot id="syn-nested-inner" tags={["syn-tag-nested-inner"]} revalidate={3600}>
        <SynNestedInnerSlotContent />
      </DinouCacheSlot>
    </div>
  );
}

async function SynDynamicHole2() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="syn-hole-2" style={{ border: "1px solid #5e35b1", padding: 8 }}>
      <div>
        Hole 2 Host Seq: <span id="syn-hole2-host-seq">{s.synHole2HostSeq}</span>
      </div>
      <DinouCacheSlot id="syn-nested-outer" tags={["syn-tag-nested-outer"]} revalidate={3600}>
        <SynNestedOuterSlotContent />
      </DinouCacheSlot>
    </div>
  );
}

function SynClientSlotContent() {
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
  const ctx = getContext();
  const rawSession = ctx?.req?.cookies?.syn_session;
  const session = typeof rawSession === "string" && rawSession ? rawSession : "s-default";
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="syn-hole-3-host">
      Hole 3 Host Seq: <span id="syn-hole3-host-seq">{s.synHole3HostSeq}</span> | Session:{" "}
      <span id="syn-hole3-session">{session}</span>
    </div>
  );
}

export default function PprCacheSlotSynergyPage() {
  const s = getRigorousState();
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
        <DinouCacheSlot id="syn-shell-slot" tags={["syn-tag-shell-slot"]} revalidate={3600}>
          <SynShellSlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot id="syn-shell-ttl-slot" tags={["syn-tag-shell-ttl"]} revalidate={1}>
          <SynShellTtlSlotContent />
        </DinouCacheSlot>

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
            <DinouCacheSlot id="syn-client-slot" tags={["syn-tag-client-slot"]} revalidate={3600}>
              <SynClientSlotContent />
            </DinouCacheSlot>
            <SiblingCookieReader />
          </div>
        </Suspense>
      </div>
    </div>
  );
}
