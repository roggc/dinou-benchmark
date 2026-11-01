import { Suspense, type ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "@/shared/components/rigorous-ui";
import { rigorousSlotServerPing } from "../rigorous-actions";
import { sleep } from "@/shared/lib/data";

async function CsAlphaSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-alpha", "slot:cs-slot-alpha", "slot:*");
  const s = getRigorousState();
  return (
    <div id="cs-alpha-slot" style={{ border: "1px solid #00897b", padding: 8 }}>
      <p>
        Alpha Seq: <span id="cs-alpha-seq">{s.csAlphaSeq}</span> | Label:{" "}
        <span id="cs-alpha-label">{s.csAlphaLabel}</span>
      </p>
      <RigorousSlotWidget
        id="cs-alpha-widget"
        serverToken={`alpha-${s.csAlphaSeq}`}
        onServerPing={rigorousSlotServerPing}
      />
    </div>
  );
}

async function CsBetaSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-beta", "cs-tag-shared", "slot:cs-slot-beta", "slot:*");
  const s = getRigorousState();
  return (
    <div id="cs-beta-slot">
      Beta Seq: <span id="cs-beta-seq">{s.csBetaSeq}</span> | Label:{" "}
      <span id="cs-beta-label">{s.csBetaLabel}</span>
    </div>
  );
}

async function CsGammaSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-gamma", "cs-tag-shared", "slot:cs-slot-gamma", "slot:*");
  const s = getRigorousState();
  return (
    <div id="cs-gamma-slot">
      Gamma Seq: <span id="cs-gamma-seq">{s.csGammaSeq}</span> | Label:{" "}
      <span id="cs-gamma-label">{s.csGammaLabel}</span>
    </div>
  );
}

function CsNoCacheSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-nocache-slot">
      NoCache (revalidate=0) Seq: <span id="cs-nocache-seq">{s.csNoCacheSeq}</span>
    </div>
  );
}

async function CsTagOnlySlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-only", "slot:cs-tag-only", "slot:*");
  const s = getRigorousState();
  return (
    <div id="cs-tagonly-slot">
      TagOnly Seq: <span id="cs-tagonly-seq">{s.csTagOnlySeq}</span>
    </div>
  );
}

async function CsNestedInnerSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-nested-inner", "slot:cs-slot-nested-inner", "slot:*");
  const s = getRigorousState();
  return (
    <div id="cs-nested-inner-slot" style={{ border: "1px dotted #5e35b1", padding: 6, marginTop: 4 }}>
      Nested Inner Seq: <span id="cs-nested-inner-seq">{s.csNestedInnerSeq}</span>
    </div>
  );
}

async function CsNestedOuterSlotContent({ children }: { children: ReactNode }) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-nested-outer", "slot:cs-slot-nested-outer", "slot:*");
  const s = getRigorousState();
  return (
    <div id="cs-nested-outer-slot" style={{ border: "1px dashed #3949ab", padding: 8 }}>
      <div>
        Nested Outer Seq: <span id="cs-nested-outer-seq">{s.csNestedOuterSeq}</span>
      </div>
      {children}
    </div>
  );
}

async function CsFastTtlSlotContent() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("cs-tag-fast", "slot:cs-slot-fast", "slot:*");
  const s = getRigorousState();
  return (
    <div id="cs-fast-slot">
      Fast TTL (1s) Seq: <span id="cs-fast-seq">{s.csFastSeq}</span>
    </div>
  );
}

async function CsStampedeSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("cs-tag-stampede", "slot:cs-slot-stampede", "slot:*");
  const s = getRigorousState();
  if (s.csStampedeDelayMs > 0) {
    await sleep(s.csStampedeDelayMs);
  }
  s.csStampedeExecCount = (Number(s.csStampedeExecCount) || 0) + 1;
  return (
    <div id="cs-stampede-slot">
      Stampede Exec Count: <span id="cs-stampede-exec">{s.csStampedeExecCount}</span>
    </div>
  );
}

async function CacheSlotDynamicBody() {
  await connection();
  const s = getRigorousState();
  return (
    <div id="cs-dynamic-page">
      <h2>Cache-Slot Dynamic Host (revalidate=0)</h2>
      <p>
        Dynamic Host Seq: <span id="cs-dynamic-host-seq">{s.csDynamicHostSeq}</span>
      </p>
      <RigorousClientProbe id="cs-page-client" label="CS Page Client" />

      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
        <CsAlphaSlotContent />
        <CsBetaSlotContent />
        <CsGammaSlotContent />
        <CsNoCacheSlotContent />
        <CsTagOnlySlotContent />
        <CsNestedOuterSlotContent>
          <CsNestedInnerSlotContent />
        </CsNestedOuterSlotContent>
        <CsFastTtlSlotContent />
        <CsStampedeSlotContent />
      </div>
    </div>
  );
}

export default function CacheSlotDynamicPage() {
  return (
    <Suspense fallback={<div id="cs-dynamic-loading">Loading dynamic host...</div>}>
      <CacheSlotDynamicBody />
    </Suspense>
  );
}

