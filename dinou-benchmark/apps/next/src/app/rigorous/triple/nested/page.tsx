import { Suspense } from "react";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";
import {
  getTsNestedPprHoleSlotState,
  getTsNestedPprShellSlotState,
  getTsNestedPprShellState,
} from "../../next-cached-segments";

async function TsNestedPprShellSlotContent() {
  const s = await getTsNestedPprShellSlotState();
  return (
    <div id="ts-nested-ppr-shell-slot-box">
      Nested PPR Shell Slot Seq:{" "}
      <span id="ts-nested-ppr-shell-slot-seq">{s.tsNestedPprShellSlotSeq}</span>
    </div>
  );
}

async function TsNestedPprHoleSlotContent() {
  const s = await getTsNestedPprHoleSlotState();
  return (
    <div id="ts-nested-ppr-hole-slot-box">
      Nested PPR Hole Slot Seq:{" "}
      <span id="ts-nested-ppr-hole-slot-seq">{s.tsNestedPprHoleSlotSeq}</span>
    </div>
  );
}

async function TsNestedPprDynamicHole() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ts-nested-ppr-hole">
      <div>
        Nested PPR Hole Host Seq:{" "}
        <span id="ts-nested-ppr-hole-host-seq">{s.tsNestedPprHoleHostSeq}</span>
      </div>
      <TsNestedPprHoleSlotContent />
    </div>
  );
}

export default async function TripleNestedPprPage() {
  const s = await getTsNestedPprShellState();
  return (
    <div id="ts-nested-ppr-page">
      <h2>Triple Nested PPR Page</h2>
      <p>
        Nested PPR Shell Seq:{" "}
        <span id="ts-nested-ppr-shell-seq">{s.tsNestedPprShellSeq}</span>
      </p>
      <TsNestedPprShellSlotContent />
      <Suspense fallback={<div id="ts-fallback-nested-ppr-hole">Loading nested ppr hole...</div>}>
        <TsNestedPprDynamicHole />
      </Suspense>
    </div>
  );
}

