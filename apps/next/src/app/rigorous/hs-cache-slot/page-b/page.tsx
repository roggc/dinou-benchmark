import { RigorousClientProbe, RigorousSlotWidget } from "@/shared/components/rigorous-ui";
import { rigorousSlotServerPing } from "../../rigorous-actions";
import {
  getHscsPageBHostState,
  getHscsPageBSlotState,
} from "../../next-cached-segments";

async function HscsPageBSlotContent() {
  const s = await getHscsPageBSlotState();
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

export default async function HsCacheSlotPageB() {
  const s = await getHscsPageBHostState();
  return (
    <div id="hscs-page-b">
      <h2>HS + Cache-Slot Page B (Sibling)</h2>
      <p>
        Page B Host Seq: <span id="hscs-page-b-host-seq">{s.hscsPageBHostSeq}</span>
      </p>
      <RigorousClientProbe id="hscs-page-b-client" label="Page B Client" />
      <HscsPageBSlotContent />
    </div>
  );
}
