import { Suspense } from "react";
import { connection } from "next/server";
import { getRigorousState } from "@/shared/lib/rigorous-state";
import { sleep } from "@/shared/lib/data";
import { getHsPprSidebarShellState } from "../../next-cached-segments";

async function HsPprSidebarDynamicHole() {
  await connection();
  await sleep(20);
  const s = getRigorousState();
  return (
    <span id="hsppr-sidebar-hole">
      Sidebar Hole Seq: <strong id="hsppr-sidebar-hole-seq">{s.hspprSidebarHoleSeq}</strong>
    </span>
  );
}

export default async function HsPprSidebarPage() {
  const s = await getHsPprSidebarShellState();
  return (
    <div id="hsppr-sidebar-parallel" style={{ border: "1px dashed #8e24aa", padding: 6 }}>
      <span>
        Sidebar Shell Seq: <strong id="hsppr-sidebar-shell-seq">{s.hspprSidebarShellSeq}</strong> |{" "}
      </span>
      <Suspense fallback={<span id="hsppr-fallback-sidebar-hole">Loading sidebar hole...</span>}>
        <HsPprSidebarDynamicHole />
      </Suspense>
    </div>
  );
}

