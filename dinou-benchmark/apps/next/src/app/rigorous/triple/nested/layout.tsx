import type { ReactNode } from "react";
import { Suspense } from "react";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { sleep } from "@/shared/lib/data";

async function TsNestedLayoutSlotContent() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag("ts-tag-nested-layout-slot", "slot:ts-nested-layout-slot", "slot:*");
  const s = getRigorousState();
  return (
    <div id="ts-nested-layout-slot-box">
      L2 Layout Slot Seq:{" "}
      <span id="ts-nested-layout-slot-seq">{s.tsNestedLayoutSlotSeq}</span> | Label:{" "}
      <span id="ts-nested-layout-slot-label">{s.tsNestedLayoutSlotLabel}</span>
    </div>
  );
}

async function TsL2DynamicHole() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <div id="ts-l2-hole">
      L2 Hole Seq: <span id="ts-l2-hole-seq">{s.tsL2HoleSeq}</span>
    </div>
  );
}

async function getTsL2ShellState() {
  "use cache";
  cacheLife({ stale: 300, revalidate: 3600, expire: 3600 });
  cacheTag(
    "ts-l2-layout-tag",
    "layout:/rigorous/triple/nested",
    "subtree:/rigorous/triple/nested",
    "subtree:/rigorous/triple"
  );
  return getRigorousState();
}

export default async function TripleNestedLayout({ children }: { children: ReactNode }) {
  const s = await getTsL2ShellState();
  return (
    <div id="ts-l2-layout" style={{ border: "1px dashed #d32f2f", padding: 8, marginTop: 8 }}>
      <div>
        L2 PPR Shell Seq: <span id="ts-l2-shell-seq">{s.tsL2ShellSeq}</span>
        <RigorousClientProbe id="ts-l2-client" label="Triple L2 Client" />
      </div>
      <TsNestedLayoutSlotContent />
      <Suspense fallback={<div id="ts-fallback-l2-hole">Loading triple L2 hole...</div>}>
        <TsL2DynamicHole />
      </Suspense>
      <div id="ts-l2-outlet">{children}</div>
    </div>
  );
}

