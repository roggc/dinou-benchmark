import type { ReactNode } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { RigorousClientProbe } from "@/shared/components/rigorous-ui";
import { sleep } from "@/shared/lib/data";
import {
  getTsL2ShellState,
  getTsNestedLayoutSlotState,
} from "../../next-cached-segments";

async function TsNestedLayoutSlotContent() {
  const s = await getTsNestedLayoutSlotState();
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

