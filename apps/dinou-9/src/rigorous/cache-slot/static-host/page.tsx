import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../../shared/lib/rigorous-state";

function CsStaticHostSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-static-host-slot">
      Static Host Slot Seq: <span id="cs-static-slot-seq">{s.csStaticSlotSeq}</span>
    </div>
  );
}

function CsStaticFastSlotContent() {
  const s = getRigorousState();
  return (
    <div id="cs-static-fast-slot">
      Static Fast (1s) Slot Seq: <span id="cs-static-fast-seq">{s.csStaticFastSeq}</span>
    </div>
  );
}

export default function CacheSlotStaticHostPage() {
  const s = getRigorousState();
  return (
    <div id="cs-static-host-page">
      <h2>Cache-Slot Static Host (revalidate=3600)</h2>
      <p>
        Static Host Seq: <span id="cs-static-host-seq">{s.csStaticHostSeq}</span>
      </p>
      <DinouCacheSlot id="cs-slot-static-host" tags={["cs-tag-static-slot"]} revalidate={3600}>
        <CsStaticHostSlotContent />
      </DinouCacheSlot>
      <DinouCacheSlot id="cs-slot-static-fast" tags={["cs-tag-static-fast"]} revalidate={1}>
        <CsStaticFastSlotContent />
      </DinouCacheSlot>
    </div>
  );
}
