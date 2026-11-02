import {
  getTsStaticAHostState,
  getTsStaticASlotState,
} from "../../next-cached-segments";

async function TsStaticASlotContent() {
  const s = await getTsStaticASlotState();
  return (
    <div id="ts-static-a-slot-box">
      Static A Slot Seq: <span id="ts-static-a-slot-seq">{s.tsStaticASlotSeq}</span> | Label:{" "}
      <span id="ts-static-a-slot-label">{s.tsStaticASlotLabel}</span>
    </div>
  );
}

export default async function TripleStaticPageA() {
  const s = await getTsStaticAHostState();
  return (
    <div id="ts-static-a-page">
      <h2>Triple Static Child Page A (ppr = false)</h2>
      <p>
        Static A Host Seq: <span id="ts-static-a-host-seq">{s.tsStaticAHostSeq}</span> | Label:{" "}
        <span id="ts-static-a-host-label">{s.tsStaticAHostLabel}</span>
      </p>
      <TsStaticASlotContent />
    </div>
  );
}

