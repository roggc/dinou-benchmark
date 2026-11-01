import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { sleep } from "@/shared/lib/data";

async function TsPprBShellSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-ppr-b-shell-slot", "slot:ts-ppr-b-shell-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="ts-ppr-b-shell-slot-box">
      PPR B Shell Slot Seq:{" "}
      <span id="ts-ppr-b-shell-slot-seq">{s.tsPprBShellSlotSeq}</span> | Label:{" "}
      <span id="ts-ppr-b-shell-slot-label">{s.tsPprBShellSlotLabel}</span>
    </div>
  );
}

async function TsPprBHoleSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-ppr-b-hole-slot", "slot:ts-ppr-b-hole-slot", "slot:*");
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
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ts-ppr-b-hole">
      <div>
        PPR B Hole Host Seq: <span id="ts-ppr-b-hole-host-seq">{s.tsPprBHoleHostSeq}</span>
      </div>
      <TsPprBHoleSlotContent />
    </div>
  );
}

async function getTsPprBShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-ppr-b-tag", "page:/rigorous/triple/ppr-b", "subtree:/rigorous/triple/ppr-b");
  return getRigorousState();
}

export default async function TripleSynergyPageB() {
  const s = await getTsPprBShellState();
  return (
    <div id="ts-ppr-b-page">
      <h2>Triple Synergy Page B (Sibling PPR)</h2>
      <p>
        PPR B Shell Seq: <span id="ts-ppr-b-shell-seq">{s.tsPprBShellSeq}</span> | Label:{" "}
        <span id="ts-ppr-b-shell-label">{s.tsPprBShellLabel}</span>
      </p>
      <RigorousClientProbe id="ts-ppr-b-client" label="Triple Page B Client" />
      <TsPprBShellSlotContent />
      <Suspense fallback={<div id="ts-fallback-ppr-b-hole">Loading triple page B hole...</div>}>
        <TsPprBDynamicHole />
      </Suspense>
    </div>
  );
}

