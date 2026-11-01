import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";

async function TsNestedPprShellSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-nested-ppr-shell-slot", "slot:ts-nested-ppr-shell-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="ts-nested-ppr-shell-slot-box">
      Nested PPR Shell Slot Seq:{" "}
      <span id="ts-nested-ppr-shell-slot-seq">{s.tsNestedPprShellSlotSeq}</span>
    </div>
  );
}

async function TsNestedPprHoleSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-nested-ppr-hole-slot", "slot:ts-nested-ppr-hole-slot", "slot:*");
  const s = getRigorousState();
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

async function getTsNestedPprShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "ts-nested-ppr-page-tag",
    "page:/rigorous/triple/nested",
    "subtree:/rigorous/triple/nested"
  );
  return getRigorousState();
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

