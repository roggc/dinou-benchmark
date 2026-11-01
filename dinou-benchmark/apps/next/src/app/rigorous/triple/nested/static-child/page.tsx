import {
  getTsNestedStaticHostState,
  getTsNestedStaticSlotState,
} from "../../../next-cached-segments";

async function TsNestedStaticSlotContent() {
  const s = await getTsNestedStaticSlotState();
  return (
    <div id="ts-nested-static-slot-box">
      Nested Static Slot Seq:{" "}
      <span id="ts-nested-static-slot-seq">{s.tsNestedStaticSlotSeq}</span>
    </div>
  );
}

export default async function TripleNestedStaticChildPage() {
  const s = await getTsNestedStaticHostState();
  return (
    <div id="ts-nested-static-page">
      <h2>Triple Nested Static Child (ppr = false)</h2>
      <p>
        Nested Static Host Seq:{" "}
        <span id="ts-nested-static-host-seq">{s.tsNestedStaticHostSeq}</span>
      </p>
      <TsNestedStaticSlotContent />
    </div>
  );
}

