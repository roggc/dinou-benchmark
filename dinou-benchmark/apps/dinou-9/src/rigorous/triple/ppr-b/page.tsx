import { Suspense } from "react";
import { getContext } from "dinou";
import { DinouCacheSlot } from "dinou/server";
import { getRigorousState } from "../../../shared/lib/rigorous-state";
import { RigorousClientProbe } from "../../../shared/components/rigorous-ui";
import { sleep } from "../../../shared/lib/data";

function TsPprBShellSlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-ppr-b-shell-slot-box">
      PPR B Shell Slot Seq:{" "}
      <span id="ts-ppr-b-shell-slot-seq">{s.tsPprBShellSlotSeq}</span> | Label:{" "}
      <span id="ts-ppr-b-shell-slot-label">{s.tsPprBShellSlotLabel}</span>
    </div>
  );
}

function TsPprBHoleSlotContent() {
  const s = getRigorousState();
  return (
    <div id="ts-ppr-b-hole-slot-box">
      PPR B Hole Slot Seq:{" "}
      <span id="ts-ppr-b-hole-slot-seq">{s.tsPprBHoleSlotSeq}</span> | Label:{" "}
      <span id="ts-ppr-b-hole-slot-label">{s.tsPprBHoleSlotLabel}</span>
    </div>
  );
}

async function TsPprBDynamicHole() {
  const ctx = getContext();
  void ctx?.req?.headers?.["user-agent"];
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ts-ppr-b-hole">
      <div>
        PPR B Hole Host Seq: <span id="ts-ppr-b-hole-host-seq">{s.tsPprBHoleHostSeq}</span>
      </div>
      <DinouCacheSlot
        id="ts-ppr-b-hole-slot"
        tags={["ts-tag-ppr-b-hole-slot"]}
        revalidate={3600}
      >
        <TsPprBHoleSlotContent />
      </DinouCacheSlot>
    </div>
  );
}

export default function TripleSynergyPageB() {
  const s = getRigorousState();
  return (
    <div id="ts-ppr-b-page">
      <h2>Triple Synergy Page B (Sibling PPR)</h2>
      <p>
        PPR B Shell Seq: <span id="ts-ppr-b-shell-seq">{s.tsPprBShellSeq}</span> | Label:{" "}
        <span id="ts-ppr-b-shell-label">{s.tsPprBShellLabel}</span>
      </p>
      <RigorousClientProbe id="ts-ppr-b-client" label="Triple Page B Client" />
      <DinouCacheSlot
        id="ts-ppr-b-shell-slot"
        tags={["ts-tag-ppr-b-shell-slot"]}
        revalidate={3600}
      >
        <TsPprBShellSlotContent />
      </DinouCacheSlot>
      <Suspense fallback={<div id="ts-fallback-ppr-b-hole">Loading triple page B hole...</div>}>
        <TsPprBDynamicHole />
      </Suspense>
    </div>
  );
}
