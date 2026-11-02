import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "../../shared/components/rigorous-ui";
import { rigorousSlotServerPing } from "../rigorous-actions";
import { sleep } from "../../shared/lib/data";

async function HscsPageASlotContent() {
  const s = { ...getRigorousState() };
  if (s.hscsPageASlotDelayMs > 0) {
    await sleep(s.hscsPageASlotDelayMs);
  }
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

function HscsPageASharedSlotContent() {
  const s = getRigorousState();
  return (
    <div id="hscs-page-a-shared-box">
      Page A Shared Seq: <span id="hscs-page-a-shared-seq">{s.hscsPageASharedSeq}</span>
    </div>
  );
}

function HscsPageAInnerSlotContent() {
  const s = getRigorousState();
  return (
    <div id="hscs-page-a-inner-box" style={{ border: "1px dotted #1565c0", padding: 4, marginTop: 4 }}>
      Page A Inner Seq: <span id="hscs-page-a-inner-seq">{s.hscsPageAInnerSeq}</span>
    </div>
  );
}

function HscsPageAOuterSlotContent() {
  const s = getRigorousState();
  return (
    <div id="hscs-page-a-outer-box" style={{ border: "1px dashed #1565c0", padding: 6 }}>
      <div>
        Page A Outer Seq: <span id="hscs-page-a-outer-seq">{s.hscsPageAOuterSeq}</span>
      </div>
      <DinouCacheSlot id="hscs-page-a-inner-slot" tags={["hscs-tag-page-a-inner"]} revalidate={3600}>
        <HscsPageAInnerSlotContent />
      </DinouCacheSlot>
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

function HscsPageATtlSlotContent() {
  const s = getRigorousState();
  return (
    <div id="hscs-page-a-ttl-box">
      Page A TTL (1s) Seq: <span id="hscs-page-a-ttl-seq">{s.hscsPageATtlSeq}</span>
    </div>
  );
}

export default function HsCacheSlotPageA() {
  const s = getRigorousState();
  return (
    <div id="hscs-page-a">
      <h2>HS + Cache-Slot Page A (Non-PPR)</h2>
      <p>
        Page A Host Seq: <span id="hscs-page-a-host-seq">{s.hscsPageAHostSeq}</span>
      </p>
      <RigorousClientProbe id="hscs-page-a-client" label="Page A Client" />

      <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
        <DinouCacheSlot id="hscs-page-a-slot" tags={["hscs-tag-page-a-slot"]} revalidate={3600}>
          <HscsPageASlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot id="hscs-page-a-shared-slot" tags={["hscs-tag-shared"]} revalidate={3600}>
          <HscsPageASharedSlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot id="hscs-page-a-outer-slot" tags={["hscs-tag-page-a-outer"]} revalidate={3600}>
          <HscsPageAOuterSlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot id="hscs-page-a-dyn-slot" revalidate={0}>
          <HscsPageADynSlotContent />
        </DinouCacheSlot>

        <DinouCacheSlot id="hscs-page-a-ttl-slot" tags={["hscs-tag-page-a-ttl"]} revalidate={1}>
          <HscsPageATtlSlotContent />
        </DinouCacheSlot>
      </div>
    </div>
  );
}
