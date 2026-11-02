import { Suspense, type ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "@/shared/components/rigorous-ui";
import { rigorousSlotServerPing } from "../rigorous-actions";
import {
  getHscsPageAHostState,
  getHscsPageAInnerSlotState,
  getHscsPageAOuterSlotState,
  getHscsPageASharedSlotState,
  getHscsPageASlotState,
} from "../next-cached-segments";

async function HscsPageASlotContent() {
  const s = await getHscsPageASlotState();
  return (
    <div id="hscs-page-a-slot-box" style={{ border: "1px solid #2e7d32", padding: 6 }}>
      <div>
        Page A Slot Seq: <span id="hscs-page-a-slot-seq">{s.hscsPageASlotSeq}</span> | Label:{" "}
        <span id="hscs-page-a-slot-label">{s.hscsPageASlotLabel}</span>
      </div>
      <RigorousSlotWidget
        id="hscs-page-a-slot-widget"
        serverToken={`page-a-slot-${s.hscsPageASlotSeq}`}
        onServerPing={rigorousSlotServerPing}
      />
    </div>
  );
}

async function HscsPageASharedSlotContent() {
  const s = await getHscsPageASharedSlotState();
  return (
    <div id="hscs-page-a-shared-box">
      Page A Shared Seq: <span id="hscs-page-a-shared-seq">{s.hscsPageASharedSeq}</span>
    </div>
  );
}

async function HscsPageAInnerSlotContent() {
  const s = await getHscsPageAInnerSlotState();
  return (
    <div id="hscs-page-a-inner-box" style={{ border: "1px dotted #1565c0", padding: 4, marginTop: 4 }}>
      Page A Inner Seq: <span id="hscs-page-a-inner-seq">{s.hscsPageAInnerSeq}</span>
    </div>
  );
}

async function HscsPageAOuterSlotContent({ children }: { children: ReactNode }) {
  const s = await getHscsPageAOuterSlotState();
  return (
    <div id="hscs-page-a-outer-box" style={{ border: "1px dashed #1565c0", padding: 6 }}>
      <div>
        Page A Outer Seq: <span id="hscs-page-a-outer-seq">{s.hscsPageAOuterSeq}</span>
      </div>
      {children}
    </div>
  );
}

function HscsPageADynSlotContent() {
  const s = getRigorousState();
  return (
    <div id="hscs-page-a-dyn-box">
      Page A Dyn (revalidate=0) Seq: <span id="hscs-page-a-dyn-seq">{s.hscsPageADynSeq}</span>
    </div>
  );
}

async function HscsPageATtlSlotContent() {
  "use cache";
  cacheLife({ stale: 0, revalidate: 1, expire: 1 });
  cacheTag("hscs-tag-page-a-ttl", "slot:hscs-page-a-ttl-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="hscs-page-a-ttl-box">
      Page A TTL (1s) Seq: <span id="hscs-page-a-ttl-seq">{s.hscsPageATtlSeq}</span>
    </div>
  );
}

export default async function HsCacheSlotPageA() {
  const s = await getHscsPageAHostState();
  return (
    <div id="hscs-page-a">
      <h2>HS + Cache-Slot Page A (Non-PPR)</h2>
      <p>
        Page A Host Seq: <span id="hscs-page-a-host-seq">{s.hscsPageAHostSeq}</span>
      </p>
      <RigorousClientProbe id="hscs-page-a-client" label="Page A Client" />

      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        <HscsPageASlotContent />
        <HscsPageASharedSlotContent />
        <HscsPageAOuterSlotContent>
          <HscsPageAInnerSlotContent />
        </HscsPageAOuterSlotContent>
        <HscsPageADynSlotContent />
        <Suspense fallback={null}>
          <HscsPageATtlSlotContent />
        </Suspense>
      </div>
    </div>
  );
}
