import { Suspense } from "react";
import { getContext } from "dinou";
import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { sleep } from "../../../shared/lib/data";

function TsNestedPprShellSlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-nested-ppr-shell-slot-box">
      Nested PPR Shell Slot Seq:{" "}
      <span id="ts-nested-ppr-shell-slot-seq">{s.tsNestedPprShellSlotSeq}</span>
    </div>
  );
}

function TsNestedPprHoleSlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-nested-ppr-hole-slot-box">
      Nested PPR Hole Slot Seq:{" "}
      <span id="ts-nested-ppr-hole-slot-seq">{s.tsNestedPprHoleSlotSeq}</span>
    </div>
  );
}

async function TsNestedPprDynamicHole() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ts-nested-ppr-hole">
      <div>
        Nested PPR Hole Host Seq:{" "}
        <span id="ts-nested-ppr-hole-host-seq">{s.tsNestedPprHoleHostSeq}</span>
      </div>
      <DinouCacheSlot
        id="ts-nested-ppr-hole-slot"
        tags={["ts-tag-nested-ppr-hole-slot"]}
        revalidate={3600}
      >
        <TsNestedPprHoleSlotContent />
      </DinouCacheSlot>
    </div>
  );
}

export default function TripleNestedPprPage() {
  const s = getRigorousState();
  return (
    <div id="ts-nested-ppr-page">
      <h2>Triple Nested PPR Page</h2>
      <p>
        Nested PPR Shell Seq:{" "}
        <span id="ts-nested-ppr-shell-seq">{s.tsNestedPprShellSeq}</span>
      </p>
      <DinouCacheSlot
        id="ts-nested-ppr-shell-slot"
        tags={["ts-tag-nested-ppr-shell-slot"]}
        revalidate={3600}
      >
        <TsNestedPprShellSlotContent />
      </DinouCacheSlot>
      <Suspense fallback={<div id="ts-fallback-nested-ppr-hole">Loading nested ppr hole...</div>}>
        <TsNestedPprDynamicHole />
      </Suspense>
    </div>
  );
}
