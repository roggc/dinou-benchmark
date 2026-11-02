import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../../shared/lib/rigorous-state";

function TsStaticASlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-static-a-slot-box">
      Static A Slot Seq: <span id="ts-static-a-slot-seq">{s.tsStaticASlotSeq}</span> | Label:{" "}
      <span id="ts-static-a-slot-label">{s.tsStaticASlotLabel}</span>
    </div>
  );
}

export default function TripleStaticPageA() {
  const s = getRigorousState();
  return (
    <div id="ts-static-a-page">
      <h2>Triple Static Child Page A (ppr = false)</h2>
      <p>
        Static A Host Seq: <span id="ts-static-a-host-seq">{s.tsStaticAHostSeq}</span> | Label:{" "}
        <span id="ts-static-a-host-label">{s.tsStaticAHostLabel}</span>
      </p>
      <DinouCacheSlot id="ts-static-a-slot" tags={["ts-tag-static-a-slot"]} revalidate={3600}>
        <TsStaticASlotContent />
      </DinouCacheSlot>
    </div>
  );
}
