import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../../../shared/lib/rigorous-state";

function TsNestedStaticSlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-nested-static-slot-box">
      Nested Static Slot Seq:{" "}
      <span id="ts-nested-static-slot-seq">{s.tsNestedStaticSlotSeq}</span>
    </div>
  );
}

export default function TripleNestedStaticChildPage() {
  const s = getRigorousState();
  return (
    <div id="ts-nested-static-page">
      <h2>Triple Nested Static Child (ppr = false)</h2>
      <p>
        Nested Static Host Seq:{" "}
        <span id="ts-nested-static-host-seq">{s.tsNestedStaticHostSeq}</span>
      </p>
      <DinouCacheSlot
        id="ts-nested-static-slot"
        tags={["ts-tag-nested-static-slot"]}
        revalidate={3600}
      >
        <TsNestedStaticSlotContent />
      </DinouCacheSlot>
    </div>
  );
}
