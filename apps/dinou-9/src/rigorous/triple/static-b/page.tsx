import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../../shared/lib/rigorous-state";

function TsStaticBSlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-static-b-slot-box">
      Static B Slot Seq: <span id="ts-static-b-slot-seq">{s.tsStaticBSlotSeq}</span>
    </div>
  );
}

export default function TripleStaticPageB() {
  const s = getRigorousState();
  return (
    <div id="ts-static-b-page">
      <h2>Triple Static Child Page B (ppr = false)</h2>
      <p>
        Static B Host Seq: <span id="ts-static-b-host-seq">{s.tsStaticBHostSeq}</span>
      </p>
      <DinouCacheSlot id="ts-static-b-slot" tags={["ts-tag-static-b-slot"]} revalidate={3600}>
        <TsStaticBSlotContent />
      </DinouCacheSlot>
    </div>
  );
}
