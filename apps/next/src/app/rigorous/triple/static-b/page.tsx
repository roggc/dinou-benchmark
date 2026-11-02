import {
  getTsStaticBHostState,
  getTsStaticBSlotState,
} from "../../next-cached-segments";

async function TsStaticBSlotContent() {
  const s = await getTsStaticBSlotState();
  return (
    <div id="ts-static-b-slot-box">
      Static B Slot Seq: <span id="ts-static-b-slot-seq">{s.tsStaticBSlotSeq}</span>
    </div>
  );
}

export default async function TripleStaticPageB() {
  const s = await getTsStaticBHostState();
  return (
    <div id="ts-static-b-page">
      <h2>Triple Static Child Page B (ppr = false)</h2>
      <p>
        Static B Host Seq: <span id="ts-static-b-host-seq">{s.tsStaticBHostSeq}</span>
      </p>
      <TsStaticBSlotContent />
    </div>
  );
}
