import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../../shared/lib/rigorous-state";

function HscsNestedPageSlotContent() {
  const s = getRigorousState();
  return (
    <div id="hscs-nested-page-slot-box">
      Nested Page Slot Seq:{" "}
      <span id="hscs-nested-page-slot-seq">{s.hscsNestedPageSlotSeq}</span> | Label:{" "}
      <span id="hscs-nested-page-slot-label">{s.hscsNestedPageSlotLabel}</span>
    </div>
  );
}

export default function HsCacheSlotNestedPage() {
  const s = getRigorousState();
  return (
    <div id="hscs-nested-page">
      <h2>HS + Cache-Slot Nested Page</h2>
      <p>
        Nested Page Host Seq:{" "}
        <span id="hscs-nested-page-host-seq">{s.hscsNestedPageHostSeq}</span>
      </p>
      <DinouCacheSlot
        id="hscs-nested-page-slot"
        tags={["hscs-tag-nested-page-slot"]}
        revalidate={3600}
      >
        <HscsNestedPageSlotContent />
      </DinouCacheSlot>
    </div>
  );
}
