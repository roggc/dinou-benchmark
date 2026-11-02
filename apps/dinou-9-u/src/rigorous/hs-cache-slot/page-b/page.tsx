import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { RigorousClientProbe, RigorousSlotWidget } from "../../../shared/components/rigorous-ui";
import { rigorousSlotServerPing } from "../../rigorous-actions";

function HscsPageBSlotContent() {
  const s = getRigorousState();
  return (
    <div id="hscs-page-b-slot-box" style={{ border: "1px solid #ef6c00", padding: 6 }}>
      <div>
        Page B Slot Seq: <span id="hscs-page-b-slot-seq">{s.hscsPageBSlotSeq}</span> | Label:{" "}
        <span id="hscs-page-b-slot-label">{s.hscsPageBSlotLabel}</span>
      </div>
      <RigorousSlotWidget
        id="hscs-page-b-slot-widget"
        serverToken={`page-b-slot-${s.hscsPageBSlotSeq}`}
        onServerPing={rigorousSlotServerPing}
      />
    </div>
  );
}

export default function HsCacheSlotPageB() {
  const s = getRigorousState();
  return (
    <div id="hscs-page-b">
      <h2>HS + Cache-Slot Page B (Sibling)</h2>
      <p>
        Page B Host Seq: <span id="hscs-page-b-host-seq">{s.hscsPageBHostSeq}</span>
      </p>
      <RigorousClientProbe id="hscs-page-b-client" label="Page B Client" />
      <DinouCacheSlot id="hscs-page-b-slot" tags={["hscs-tag-page-b-slot"]} revalidate={3600}>
        <HscsPageBSlotContent />
      </DinouCacheSlot>
    </div>
  );
}
